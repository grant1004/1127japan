const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
const packageJson = require('./package.json');
const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL 連接設定
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

const notificationPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 儲存所有 SSE 連接
const activeConnections = new Set();

// 1. 設定資料庫通知監聽
async function setupDatabaseNotifications() {
    try {
        const client = await notificationPool.connect();
        
        // 監聽 itinerary_changes 頻道
        await client.query('LISTEN itinerary_changes');
        
        // 當收到通知時執行
        client.on('notification', (msg) => {
            console.log('📢 收到資料庫通知:', msg.payload);
            
            try {
                const data = JSON.parse(msg.payload);
                broadcastToAllClients({
                    type: 'itinerary_updated',
                    data: data,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('解析通知失敗:', error);
            }
        });
        
        console.log('✅ 資料庫通知監聽已啟動');
    } catch (error) {
        console.log('⚠️ 無法設定資料庫通知，將使用檔案系統模式:', error.message);
        // 在沒有資料庫的環境下，我們仍然可以繼續運行，只是沒有即時通知功能
    }
}

// 2. 廣播給所有連接的客戶端
function broadcastToAllClients(message) {
    const messageStr = `data: ${JSON.stringify(message)}\n\n`;
    
    activeConnections.forEach(connection => {
        try {
            connection.write(messageStr);
        } catch (error) {
            // 移除失效的連接
            activeConnections.delete(connection);
        }
    });
    
    console.log(`📡 已廣播給 ${activeConnections.size} 個客戶端`);
}

// 測試資料庫連接
pool.on('connect', () => {
    console.log('✅ 已連接到 PostgreSQL 資料庫');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL 連接錯誤:', err);
});


// 初始化資料庫
async function initializeDatabase() {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS itinerary (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        // 新增：暫時資訊表
        const createTempNotesQuery = `
            CREATE TABLE IF NOT EXISTS temp_notes (
                id SERIAL PRIMARY KEY,
                note_id VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(10) DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await pool.query(createTableQuery);
        await pool.query(createTempNotesQuery);
        console.log('✅ 資料表已就緒');
        
        // 檢查是否有資料，沒有則插入預設資料
        const checkData = await pool.query('SELECT COUNT(*) FROM itinerary');
        if (parseInt(checkData.rows[0].count) === 0) {
            const defaultData = getDefaultItinerary();
            await saveItineraryToDb(defaultData);
            console.log('✅ 已插入預設行程資料');
        }
    } catch (error) {
        console.error('❌ 資料庫初始化失敗:', error);
    }
}

// 中介軟體
app.use(express.static('public'));
app.use(express.json());

// 讓 CHANGELOG.md 可以被前端存取
app.get('/CHANGELOG.md', (req, res) => {
    res.sendFile(path.join(__dirname, 'CHANGELOG.md'));
});

// 行程資料文件路徑
const DATA_FILE = path.join(__dirname, 'data', 'itinerary.json');

// 確保資料目錄存在
async function ensureDataDir() {
    try {
        await fs.access(path.join(__dirname, 'data'));
    } catch {
        await fs.mkdir(path.join(__dirname, 'data'));
    }
}

async function saveItineraryToDb(itineraryData) {
    try {
        const query = `
            INSERT INTO itinerary (title, subtitle, data, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING id
        `;
        
        const values = [
            itineraryData.title,
            itineraryData.subtitle,
            { 
                days: itineraryData.days,
                notes: itineraryData.notes || {}  // 🔥 確保包含備註
            }
        ];
        
        const result = await pool.query(query, values);
        console.log('✅ 資料已儲存到資料庫');
        return result.rows[0].id; // 返回新創建的 ID
    } catch (error) {
        console.error('儲存到資料庫失敗:', error);
        throw error;
    }
}

async function updateItineraryInDb(itineraryData, id = null) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        let updateQuery, values;
        
        if (id) {
            // 更新指定 ID 的行程
            updateQuery = `
                UPDATE itinerary 
                SET title = $1, subtitle = $2, data = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING id, title
            `;
            values = [
                itineraryData.title,
                itineraryData.subtitle,
                { 
                    days: itineraryData.days,
                    notes: itineraryData.notes || {}
                },
                id
            ];
        } else {
            // 更新最新的行程（向後相容）
            updateQuery = `
                UPDATE itinerary 
                SET title = $1, subtitle = $2, data = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = (SELECT id FROM itinerary ORDER BY updated_at DESC LIMIT 1)
                RETURNING id, title
            `;
            values = [
                itineraryData.title,
                itineraryData.subtitle,
                { 
                    days: itineraryData.days,
                    notes: itineraryData.notes || {}
                }
            ];
        }
        
        const result = await client.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            throw new Error('無法找到要更新的行程');
        }
        
        // 通知邏輯
        const notifyPayload = JSON.stringify({
            action: 'update',
            id: result.rows[0].id,
            title: result.rows[0].title,
            updatedAt: new Date().toISOString()
        });
        
        const notifyQuery = `NOTIFY itinerary_changes, '${notifyPayload.replace(/'/g, "''")}'`;
        await client.query(notifyQuery);
		
        await client.query('COMMIT');
        console.log('✅ 資料已更新並發送通知');
        
        return result.rows[0].id; // 返回更新的行程 ID
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// 在您的後端程式碼中修改
async function loadItineraryFromDb(id = null) {
    try {
        let query, values;
        
        if (id) {
            // 載入指定 ID 的行程
            query = 'SELECT * FROM itinerary WHERE id = $1';
            values = [id];
        } else {
            // 載入最新的行程
            query = 'SELECT * FROM itinerary ORDER BY updated_at DESC LIMIT 1';
            values = [];
        }
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            if (id) {
                return null; // 指定 ID 不存在
            } else {
                return getDefaultItinerary(); // 沒有任何行程時返回預設
            }
        }
        
        const row = result.rows[0];
        
        // 🔥 修正：返回完整的資料結構，包含 notes 和 id
        return {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            days: row.data.days || [],
            notes: row.data.notes || {}  // 從 data.notes 獲取備註
        };
    } catch (error) {
        console.error('從資料庫讀取失敗:', error);
        if (id) {
            // 在沒有資料庫時，如果請求的是 ID 1，返回預設行程
            if (id == 1) {
                const defaultItinerary = getDefaultItinerary();
                return {
                    id: 1,
                    ...defaultItinerary
                };
            } else {
                return null; // 其他 ID 不存在
            }
        } else {
            return getDefaultItinerary();
        }
    }
}

// 預設行程資料

function getDefaultItinerary() {
    return {
        title: "日本關西四國行程",
        subtitle: "2025年11月22日 - 11月29日 (8天7夜)",
        notes: {  // 🔥 新增：預設備註結構
            "item1": [
                {
                    id: "note1",
                    priority: "high",
                    description: "交通提醒",
                    content: "https://www.kansai-airport.or.jp/",
                    type: "link"
                }
            ]
        },
        days: [
            {
                id: "day1",
                date: "11/22 (六)",
                title: "台北 → 大阪",
                accommodation: "大阪",
                items: [
                    {
                        id: "item1",
                        type: "airport",
                        time: "07:30",
                        name: "桃園國際機場",
                        activity: "辦理登機手續、免稅店"
                    },
                    {
                        id: "item2", 
                        type: "transport",
                        time: "07:30-11:00",
                        name: "長榮航空 BR109",
                        activity: "飛行時間約2.5小時"
                    },
                    {
                        id: "item3",
                        type: "city",
                        time: "11:00-18:00", 
                        name: "大阪",
                        activity: "關西機場→市區、心齋橋、道頓堀"
                    }
                ]
            },
            {
                id: "day2",
                date: "11/23 (日)",
                title: "神戶一日遊",
                accommodation: "神戶",
                items: [
                    {
                        id: "item4",
                        type: "city",
                        time: "09:00-12:00",
                        name: "神戶港、北野異人館",
                        activity: "神戶港周邊、北野異人館街"
                    },
                    {
                        id: "item5",
                        type: "city", 
                        time: "12:00-14:00",
                        name: "神戶牛午餐",
                        activity: "享用著名神戶牛料理"
                    },
                    {
                        id: "item6",
                        type: "attraction",
                        time: "14:00-18:00",
                        name: "有馬溫泉或神戶市區",
                        activity: "有馬溫泉半日遊或神戶市區購物"
                    }
                ]
            },
            {
                id: "day3",
                date: "11/24 (一)",
                title: "神戶 → 小豆島",
                accommodation: "小豆島",
                items: [
                    {
                        id: "item7",
                        type: "accommodation",
                        time: "07:25",
                        name: "三宮出發",
                        activity: "神戶旅館退房，前往神戶港"
                    },
                    {
                        id: "item8",
                        type: "transport",
                        time: "08:15-11:35",
                        name: "神戶→小豆島高速船",
                        activity: "神戶機頭出發→坂手碼頭到着 (A班次，約3小時20分)"
                    },
                    {
                        id: "item9",
                        type: "attraction",
                        time: "12:16-19:00",
                        name: "小豆島",
                        activity: "坂手站→橄欖公園、醬油廠、瀨戶內海夕陽"
                    }
                ]
            },
            {
                id: "day4",
                date: "11/25 (二)",
                title: "小豆島深度遊",
                accommodation: "小豆島",
                items: [
                    {
                        id: "item10",
                        type: "attraction",
                        time: "全日",
                        name: "小豆島深度遊",
                        activity: "寒霞溪紅葉、中山千枚田、二十四瞳映畫村"
                    }
                ]
            },
            {
                id: "day5",
                date: "11/26 (三)",
                title: "小豆島 → 高松 → 松山",
                accommodation: "松山",
                items: [
                    {
                        id: "item11",
                        type: "accommodation",
                        time: "09:00-12:00",
                        name: "小豆島最後遊覽",
                        activity: "橄欖園、天使散步道、醬之鄉，旅館退房"
                    },
                    {
                        id: "item12",
                        type: "transport",
                        time: "12:20-13:20",
                        name: "小豆島→高松渡輪",
                        activity: "土庄港→高松港 (約1小時)"
                    },
                    {
                        id: "item13",
                        type: "transport",
                        time: "14:00-17:00",
                        name: "高松→松山",
                        activity: "JR或巴士前往松山 (約3小時)"
                    },
                    {
                        id: "item14",
                        type: "city",
                        time: "17:00-19:00",
                        name: "松山",
                        activity: "抵達松山、道後溫泉街"
                    }
                ]
            },
            {
                id: "day6",
                date: "11/27 (四)",
                title: "松山 + 演唱會",
                accommodation: "松山",
                items: [
                    {
                        id: "item15",
                        type: "attraction",
                        time: "09:00-17:00",
                        name: "松山自由時間",
                        activity: "道後溫泉本館、松山城、石手寺"
                    },
                    {
                        id: "item16",
                        type: "event",
                        time: "18:00",
                        name: "演唱會",
                        activity: "演唱會欣賞"
                    }
                ]
            },
            {
                id: "day7",
                date: "11/28 (五)",
                title: "下灘站海中鐵軌 + 青島",
                accommodation: "松山",
                items: [
                    {
                        id: "item17",
                        type: "transport",
                        time: "09:45-10:43",
                        name: "JR予讚線",
                        activity: "松山→下灘站"
                    },
                    {
                        id: "item18",
                        type: "attraction",
                        time: "10:43-12:29",
                        name: "下灘站",
                        activity: "神隱少女海中鐵軌拍攝地"
                    },
                    {
                        id: "item19",
                        type: "transport",
                        time: "12:29-12:44",
                        name: "JR予讚線",
                        activity: "下灘→伊予長濱"
                    },
                    {
                        id: "item20",
                        type: "transport",
                        time: "14:30-15:05",
                        name: "長濱港→青島",
                        activity: "搭船前往青島 (票價700日圓)"
                    },
                    {
                        id: "item21",
                        type: "attraction",
                        time: "15:05-16:15",
                        name: "青島",
                        activity: "青島探索"
                    },
                    {
                        id: "item22",
                        type: "transport",
                        time: "16:15-16:50",
                        name: "青島→長濱港",
                        activity: "返回長濱港"
                    },
                    {
                        id: "item23",
                        type: "transport",
                        time: "17:00-18:30",
                        name: "伊予長濱→松山",
                        activity: "JR返回松山市區"
                    },
                    {
                        id: "item24",
                        type: "attraction",
                        time: "19:00-21:00",
                        name: "道後溫泉",
                        activity: "道後溫泉本館泡湯、溫泉街散步、晚餐"
                    }
                ]
            },
            {
                id: "day8",
                date: "11/29 (六)",
                title: "松山 → 台北",
                accommodation: "返程",
                items: [
                    {
                        id: "item25",
                        type: "accommodation",
                        time: "09:00-10:00",
                        name: "松山",
                        activity: "旅館退房、前往機場"
                    },
                    {
                        id: "item26",
                        type: "transport",
                        time: "11:25-13:15",
                        name: "長榮航空 BR109",
                        activity: "飛行時間約1小時50分"
                    },
                    {
                        id: "item27",
                        type: "airport",
                        time: "13:15",
                        name: "桃園機場",
                        activity: "返回台北，行程結束"
                    }
                ]
            }
        ]
   
    };
}


// API 路由

// ===== 多頁面管理 API =====

// 取得所有行程列表
app.get('/api/itineraries', async (req, res) => {
    try {
        const query = 'SELECT id, title, subtitle, created_at, updated_at FROM itinerary ORDER BY updated_at DESC';
        const result = await pool.query(query);
        
        const itineraries = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
        
        res.json(itineraries);
    } catch (error) {
        console.error('讀取行程列表失敗，返回預設列表:', error.message);
        
        // 回退到文件系統模式 - 返回預設行程列表
        const defaultItinerary = getDefaultItinerary();
        const now = new Date().toISOString();
        
        res.json([{
            id: 1,
            title: defaultItinerary.title,
            subtitle: defaultItinerary.subtitle,
            createdAt: now,
            updatedAt: now
        }]);
    }
});

// 獲取指定 ID 的行程資料
app.get('/api/itinerary/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const itinerary = await loadItineraryFromDb(id);
        if (!itinerary) {
            return res.status(404).json({ error: '找不到指定的行程' });
        }
        res.json(itinerary);
    } catch (error) {
        console.error('讀取行程資料失敗，回退到預設資料:', error.message);
        
        // 回退到預設行程
        const defaultItinerary = getDefaultItinerary();
        res.json({
            id: 1,
            ...defaultItinerary
        });
    }
});

// 獲取最新行程資料（保持向後相容）
app.get('/api/itinerary', async (req, res) => {
    try {
        const itinerary = await loadItineraryFromDb();
        res.json(itinerary);
    } catch (error) {
        console.error('讀取行程資料失敗:', error);
        res.status(500).json({ error: '讀取行程資料失敗' });
    }
});

// 刪除指定行程
app.delete('/api/itinerary/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 檢查是否存在
        const checkQuery = 'SELECT COUNT(*) FROM itinerary WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [id]);
        
        if (parseInt(checkResult.rows[0].count) === 0) {
            return res.status(404).json({ error: '找不到指定的行程' });
        }
        
        // 刪除行程
        const deleteQuery = 'DELETE FROM itinerary WHERE id = $1';
        await pool.query(deleteQuery, [id]);
        
        res.json({ success: true, message: '行程已刪除' });
    } catch (error) {
        console.error('刪除行程失敗:', error);
        res.status(500).json({ error: '刪除行程失敗' });
    }
});

// 創建新行程
app.post('/api/itinerary', async (req, res) => {
    try {
        const itinerary = req.body;
        const newId = await saveItineraryToDb(itinerary);
        res.json({ 
            success: true, 
            message: '新行程已成功創建',
            id: newId
        });
    } catch (error) {
        console.error('創建行程失敗:', error);
        res.status(500).json({ error: '創建行程失敗' });
    }
});

// 更新指定行程
app.put('/api/itinerary/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const itinerary = req.body;
        
        const updatedId = await updateItineraryInDb(itinerary, id);
        res.json({ 
            success: true, 
            message: '行程已成功更新',
            id: updatedId
        });
    } catch (error) {
        console.error('更新行程失敗:', error);
        res.status(500).json({ error: '更新行程失敗' });
    }
});


// 新增行程項目
app.post('/api/itinerary/item/:dayId', async (req, res) => {
    try {
        const { dayId } = req.params;
        const newItem = req.body;
        
        const itinerary = await loadItinerary();
        const day = itinerary.days.find(d => d.id === dayId);
        
        if (!day) {
            return res.status(404).json({ error: '找不到指定的日期' });
        }
        
        // 產生新的 ID
        newItem.id = `item${Date.now()}`;
        day.items.push(newItem);
        
        await saveItinerary(itinerary);
        res.json({ success: true, item: newItem });
    } catch (error) {
        console.error('新增項目失敗:', error);
        res.status(500).json({ error: '新增項目失敗' });
    }
});

app.put('/api/itinerary/item/:dayId/:itemId', async (req, res) => {
    try {
        const { dayId, itemId } = req.params;
        const updatedItem = req.body;
        
        const itinerary = await loadItineraryFromDb();
        const day = itinerary.days.find(d => d.id === dayId);
        
        if (!day) {
            return res.status(404).json({ error: '找不到指定的日期' });
        }
        
        const itemIndex = day.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ error: '找不到指定的項目' });
        }
        
        day.items[itemIndex] = { ...day.items[itemIndex], ...updatedItem };
        
        await updateItineraryInDb(itinerary);
        res.json({ success: true, message: '項目已更新' });
    } catch (error) {
        console.error('更新項目失敗:', error);
        res.status(500).json({ error: '更新項目失敗' });
    }
});

// 刪除行程項目
app.delete('/api/itinerary/item/:dayId/:itemId', async (req, res) => {
    try {
        const { dayId, itemId } = req.params;
        
        const itinerary = await loadItinerary();
        const day = itinerary.days.find(d => d.id === dayId);
        
        if (!day) {
            return res.status(404).json({ error: '找不到指定的日期' });
        }
        
        const itemIndex = day.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ error: '找不到指定的項目' });
        }
        
        day.items.splice(itemIndex, 1);
        
        await saveItinerary(itinerary);
        res.json({ success: true, message: '項目已刪除' });
    } catch (error) {
        console.error('刪除項目失敗:', error);
        res.status(500).json({ error: '刪除項目失敗' });
    }
});


// 獲取特定項目的備註
app.get('/api/itinerary/notes/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const itinerary = await loadItineraryFromDb();
        const notes = itinerary.notes?.[itemId] || [];
        res.json(notes);
    } catch (error) {
        console.error('讀取備註失敗:', error);
        res.status(500).json({ error: '讀取備註失敗' });
    }
});

// 新增備註
app.post('/api/itinerary/notes/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const newNote = req.body;
        
        const itinerary = await loadItineraryFromDb();
        if (!itinerary.notes) itinerary.notes = {};
        if (!itinerary.notes[itemId]) itinerary.notes[itemId] = [];
        
        newNote.id = `note_${Date.now()}`;
        itinerary.notes[itemId].push(newNote);
        
        await updateItineraryInDb(itinerary);
        res.json({ success: true, note: newNote });
    } catch (error) {
        console.error('新增備註失敗:', error);
        res.status(500).json({ error: '新增備註失敗' });
    }
});

// 更新備註
app.put('/api/itinerary/notes/:itemId/:noteId', async (req, res) => {
    try {
        const { itemId, noteId } = req.params;
        const updatedNote = req.body;
        
        const itinerary = await loadItineraryFromDb();
        const notes = itinerary.notes?.[itemId];
        
        if (!notes) {
            return res.status(404).json({ error: '找不到備註' });
        }
        
        const noteIndex = notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) {
            return res.status(404).json({ error: '找不到指定的備註' });
        }
        
        notes[noteIndex] = { ...notes[noteIndex], ...updatedNote };
        
        await updateItineraryInDb(itinerary);
        res.json({ success: true, note: notes[noteIndex] });
    } catch (error) {
        console.error('更新備註失敗:', error);
        res.status(500).json({ error: '更新備註失敗' });
    }
});

// 刪除備註
app.delete('/api/itinerary/notes/:itemId/:noteId', async (req, res) => {
    try {
        const { itemId, noteId } = req.params;
        
        const itinerary = await loadItineraryFromDb();
        const notes = itinerary.notes?.[itemId];
        
        if (!notes) {
            return res.status(404).json({ error: '找不到備註' });
        }
        
        const noteIndex = notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) {
            return res.status(404).json({ error: '找不到指定的備註' });
        }
        
        notes.splice(noteIndex, 1);
        
        await updateItineraryInDb(itinerary);
        res.json({ success: true, message: '備註已刪除' });
    } catch (error) {
        console.error('刪除備註失敗:', error);
        res.status(500).json({ error: '刪除備註失敗' });
    }
});

// ===== 暫時資訊 API =====

// 載入所有暫時資訊
async function loadTempNotesFromDb() {
    try {
        const query = 'SELECT * FROM temp_notes ORDER BY created_at DESC';
        const result = await pool.query(query);
        
        return result.rows.map(row => ({
            id: row.note_id,
            title: row.title,
            content: row.content,
            type: row.type,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    } catch (error) {
        console.error('載入暫時資訊失敗，使用檔案系統:', error.message);
        return await loadTempNotesFromFile();
    }
}

// 從檔案載入暫時資訊
async function loadTempNotesFromFile() {
    try {
        const filePath = path.join(__dirname, 'data', 'temp_notes.json');
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 檔案不存在或其他錯誤，返回空陣列
        return [];
    }
}

// 儲存暫時資訊到資料庫
async function saveTempNoteToDb(noteData) {
    try {
        const query = `
            INSERT INTO temp_notes (note_id, title, content, type)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (note_id) 
            DO UPDATE SET 
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                type = EXCLUDED.type,
                updated_at = CURRENT_TIMESTAMP
        `;
        
        await pool.query(query, [noteData.id, noteData.title, noteData.content, noteData.type]);
        
        // 發送通知
        await notifyDataChange('temp_notes_updated', { noteId: noteData.id, action: 'upsert' });
        
        return true;
    } catch (error) {
        console.error('儲存暫時資訊失敗，使用檔案系統:', error.message);
        return await saveTempNoteToFile(noteData);
    }
}

// 儲存暫時資訊到檔案
async function saveTempNoteToFile(noteData) {
    try {
        // 確保 data 資料夾存在
        const dataDir = path.join(__dirname, 'data');
        await fs.mkdir(dataDir, { recursive: true });
        
        const filePath = path.join(dataDir, 'temp_notes.json');
        
        // 載入現有資料
        let tempNotes = [];
        try {
            const data = await fs.readFile(filePath, 'utf8');
            tempNotes = JSON.parse(data);
        } catch (error) {
            // 檔案不存在，使用空陣列
            tempNotes = [];
        }
        
        // 檢查是否已存在，更新或新增
        const existingIndex = tempNotes.findIndex(note => note.id === noteData.id);
        if (existingIndex >= 0) {
            // 更新現有項目
            tempNotes[existingIndex] = {
                ...noteData,
                updatedAt: new Date().toISOString()
            };
        } else {
            // 新增項目
            tempNotes.unshift({
                ...noteData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        // 儲存到檔案
        await fs.writeFile(filePath, JSON.stringify(tempNotes, null, 2));
        
        // 發送通知（即使在檔案模式下也發送，供 SSE 使用）
        broadcastToAllClients({
            type: 'temp_notes_updated',
            data: { noteId: noteData.id, action: 'upsert' },
            timestamp: Date.now()
        });
        
        return true;
    } catch (error) {
        console.error('儲存暫時資訊到檔案失敗:', error);
        return false;
    }
}

// 刪除暫時資訊
async function deleteTempNoteFromDb(noteId) {
    try {
        const query = 'DELETE FROM temp_notes WHERE note_id = $1';
        await pool.query(query, [noteId]);
        
        // 發送通知
        await notifyDataChange('temp_notes_updated', { noteId, action: 'delete' });
        
        return true;
    } catch (error) {
        console.error('刪除暫時資訊失敗，使用檔案系統:', error.message);
        return await deleteTempNoteFromFile(noteId);
    }
}

// 從檔案刪除暫時資訊
async function deleteTempNoteFromFile(noteId) {
    try {
        const filePath = path.join(__dirname, 'data', 'temp_notes.json');
        
        // 載入現有資料
        let tempNotes = [];
        try {
            const data = await fs.readFile(filePath, 'utf8');
            tempNotes = JSON.parse(data);
        } catch (error) {
            // 檔案不存在，無需刪除
            return true;
        }
        
        // 過濾掉要刪除的項目
        const filteredNotes = tempNotes.filter(note => note.id !== noteId);
        
        // 儲存到檔案
        await fs.writeFile(filePath, JSON.stringify(filteredNotes, null, 2));
        
        // 發送通知
        broadcastToAllClients({
            type: 'temp_notes_updated',
            data: { noteId, action: 'delete' },
            timestamp: Date.now()
        });
        
        return true;
    } catch (error) {
        console.error('從檔案刪除暫時資訊失敗:', error);
        return false;
    }
}

// 獲取所有暫時資訊
app.get('/api/temp-notes', async (req, res) => {
    try {
        const tempNotes = await loadTempNotesFromDb();
        res.json(tempNotes);
    } catch (error) {
        console.error('讀取暫時資訊失敗:', error);
        res.status(500).json({ error: '讀取暫時資訊失敗' });
    }
});

// 新增或更新暫時資訊
app.post('/api/temp-notes', async (req, res) => {
    try {
        const noteData = req.body;
        
        if (!noteData.id || !noteData.title || !noteData.content) {
            return res.status(400).json({ error: '缺少必要欄位' });
        }
        
        const success = await saveTempNoteToDb(noteData);
        
        if (success) {
            res.json({ success: true, message: '暫時資訊已儲存' });
        } else {
            res.status(500).json({ error: '儲存失敗' });
        }
    } catch (error) {
        console.error('新增暫時資訊失敗:', error);
        res.status(500).json({ error: '新增暫時資訊失敗' });
    }
});

// 刪除暫時資訊
app.delete('/api/temp-notes/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const success = await deleteTempNoteFromDb(noteId);
        
        if (success) {
            res.json({ success: true, message: '暫時資訊已刪除' });
        } else {
            res.status(500).json({ error: '刪除失敗' });
        }
    } catch (error) {
        console.error('刪除暫時資訊失敗:', error);
        res.status(500).json({ error: '刪除暫時資訊失敗' });
    }
});


// 版本資訊 API
app.get('/api/version', (req, res) => {
    res.json({
        version: packageJson.version,
        name: packageJson.name,
        description: packageJson.description
    });
});

// 主頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. SSE 端點
app.get('/api/events', (req, res) => {
    // 設定 SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    // 加入連接列表
    activeConnections.add(res);
    console.log(`👋 新客戶端連接，總數: ${activeConnections.size}`);
    
    // 發送初始心跳
    res.write('data: {"type":"connected"}\n\n');
    
    // 定期心跳（防止 Railway 超時）
    const heartbeat = setInterval(() => {
        try {
            res.write('data: {"type":"heartbeat"}\n\n');
        } catch (error) {
            clearInterval(heartbeat);
            activeConnections.delete(res);
        }
    }, 30000);
    
    // 連接斷開時清理
    req.on('close', () => {
        clearInterval(heartbeat);
        activeConnections.delete(res);
        console.log(`👋 客戶端斷開，剩餘: ${activeConnections.size}`);
    });
    
    // Railway 容器重啟時優雅關閉
    process.on('SIGTERM', () => {
        res.write('data: {"type":"server_shutdown"}\n\n');
        res.end();
    });
});


// 重新排序項目
app.put('/api/itinerary/reorder', async (req, res) => {
    try {
        const { dayId, items } = req.body; // items 是重新排序後的完整陣列
        
        const itinerary = await loadItineraryFromDb();
        const day = itinerary.days.find(d => d.id === dayId);
        
        if (!day) {
            return res.status(404).json({ error: '找不到指定的日期' });
        }
        
        // 更新項目順序
        day.items = items;
        
        await updateItineraryInDb(itinerary);
        res.json({ success: true, message: '項目順序已更新' });
    } catch (error) {
        console.error('重新排序失敗:', error);
        res.status(500).json({ error: '重新排序失敗' });
    }
});

// 跨日期移動項目
app.put('/api/itinerary/move-item', async (req, res) => {
    try {
        const { 
            itemId, 
            fromDayId, 
            toDayId, 
            targetIndex 
        } = req.body;
        
        const itinerary = await loadItineraryFromDb();
        const fromDay = itinerary.days.find(d => d.id === fromDayId);
        const toDay = itinerary.days.find(d => d.id === toDayId);
        
        if (!fromDay || !toDay) {
            return res.status(404).json({ error: '找不到指定的日期' });
        }
        
        // 找到要移動的項目
        const itemIndex = fromDay.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ error: '找不到指定的項目' });
        }
        
        // 移動項目
        const [movedItem] = fromDay.items.splice(itemIndex, 1);
        toDay.items.splice(targetIndex, 0, movedItem);
        
        await updateItineraryInDb(itinerary);
        res.json({ success: true, message: '項目已移動' });
    } catch (error) {
        console.error('移動項目失敗:', error);
        res.status(500).json({ error: '移動項目失敗' });
    }
});


// 啟動伺服器
app.listen(PORT, async () => {
    console.log(`🚀 伺服器運行在 port ${PORT}`);
    
    try {
        await initializeDatabase();
    } catch (error) {
        console.log('⚠️ 資料庫無法使用，將使用檔案系統儲存:', error.message);
    }
    
    await setupDatabaseNotifications(); // 🔔 啟動通知監聽
});

// 優雅關閉
process.on('SIGINT', async () => {
    console.log('正在關閉伺服器...');
    await pool.end();
    process.exit(0);
});