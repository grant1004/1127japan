const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const PORT = process.env.PORT || 3000;

// 中介軟體
app.use(express.static('public'));
app.use(express.json());

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

// 讀取行程資料
async function loadItinerary() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 如果文件不存在，返回預設資料
        return getDefaultItinerary();
    }
}

// 儲存行程資料
async function saveItinerary(data) {
    await ensureDataDir();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 預設行程資料
function getDefaultItinerary() {
    return {
        title: "日本關西四國行程",
        subtitle: "2025年11月22日 - 11月29日 (8天7夜)",
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

// 獲取行程資料
app.get('/api/itinerary', async (req, res) => {
    try {
        const itinerary = await loadItinerary();
        res.json(itinerary);
    } catch (error) {
        console.error('讀取行程資料失敗:', error);
        res.status(500).json({ error: '讀取行程資料失敗' });
    }
});

// 儲存行程資料
app.post('/api/itinerary', async (req, res) => {
    try {
        const itinerary = req.body;
        await saveItinerary(itinerary);
        res.json({ success: true, message: '行程已成功儲存' });
    } catch (error) {
        console.error('儲存行程資料失敗:', error);
        res.status(500).json({ error: '儲存行程資料失敗' });
    }
});

// 更新單一行程項目
app.put('/api/itinerary/item/:dayId/:itemId', async (req, res) => {
    try {
        const { dayId, itemId } = req.params;
        const updatedItem = req.body;
        
        const itinerary = await loadItinerary();
        const day = itinerary.days.find(d => d.id === dayId);
        
        if (!day) {
            return res.status(404).json({ error: '找不到指定的日期' });
        }
        
        const itemIndex = day.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ error: '找不到指定的項目' });
        }
        
        day.items[itemIndex] = { ...day.items[itemIndex], ...updatedItem };
        
        await saveItinerary(itinerary);
        res.json({ success: true, message: '項目已更新' });
    } catch (error) {
        console.error('更新項目失敗:', error);
        res.status(500).json({ error: '更新項目失敗' });
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

// 主頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動伺服器
app.listen(PORT, async () => {
    await ensureDataDir();
    console.log(`伺服器運行在 http://localhost:${PORT}`);
});