let currentItinerary = null;
let isEditMode = false;
let originalItinerary = null;

// 備註資料結構
let itemNotes = {
	"item1": [
		{
			id: "note1",
			priority: "high",
			description: "交通提醒",
			content: "https://www.kansai-airport.or.jp/",
			type: "link"
		},
		{
			id: "note2",
			priority: "medium",
			description: "注意事項",
			content: "記得帶護照影本",
			type: "text"
		}
	],
	"item3": [
		{
			id: "note3",
			priority: "low",
			description: "美食推薦",
			content: "https://tabelog.com/osaka/",
			type: "link"
		}
	]
};

// 優先級配置
const priorityConfig = {
	high: { label: "重要", color: "#e53e3e", bgColor: "#fed7d7" },
	medium: { label: "普通", color: "#d69e2e", bgColor: "#faf089" },
	low: { label: "參考", color: "#38a169", bgColor: "#c6f6d5" }
};

// 測試資料
const defaultItinerary = {
	title: "日本關西四國行程",
	subtitle: "2025年11月22日 - 11月29日 (8天7夜)",
	days: [
		{
			id: "day1",
			date: "11/22 (五)",
			title: "第一天 - 出發",
			accommodation: "關西機場飯店",
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
			date: "11/23 (六)",
			title: "第二天 - 大阪觀光",
			accommodation: "大阪市區飯店",
			items: [
				{
					id: "item4",
					type: "attraction",
					time: "09:00",
					name: "大阪城",
					activity: "參觀天守閣"
				},
				{
					id: "item5",
					type: "attraction",
					time: "14:00",
					name: "道頓堀",
					activity: "購物、美食"
				}
			]
		}
	]
};

// 載入行程資料
async function loadItinerary() {
	try {
		setStatus('loading', '載入中...');
		
		// 嘗試從API載入，如果失敗則使用預設資料
		try {
			const response = await fetch('/api/itinerary');
			if (response.ok) {
				const data = await response.json();
				
				// 🔥 修正：根據實際資料庫結構載入
				currentItinerary = {
					title: data.title,
					subtitle: data.subtitle,
					days: data.days
				};
				
				// 🔥 修正：備註資料直接從 API 回應中獲取
				itemNotes = data.notes || {};
				
				console.log('✅ 從 API 載入資料:', { 
					title: data.title, 
					daysCount: data.days?.length, 
					notesCount: Object.keys(itemNotes).length 
				});
			} else {
				throw new Error('API not available');
			}
		} catch (apiError) {
			console.log('API載入失敗，使用預設資料:', apiError.message);
			currentItinerary = defaultItinerary;
			// 使用預設備註資料
			itemNotes = {
				"item1": [
					{
						id: "note1",
						priority: "high",
						description: "交通提醒",
						content: "https://www.kansai-airport.or.jp/",
						type: "link"
					},
					{
						id: "note2",
						priority: "medium",
						description: "注意事項",
						content: "記得帶護照影本",
						type: "text"
					}
				],
				"item3": [
					{
						id: "note3",
						priority: "low",
						description: "美食推薦",
						content: "https://tabelog.com/osaka/",
						type: "link"
					}
				]
			};
		}
		
		renderItinerary();
		setStatus('saved', '已載入');
		console.log('📝 載入的備註資料:', itemNotes);
	} catch (error) {
		console.error('載入行程失敗:', error);
		setStatus('error', '載入失敗');
	}
}

// 儲存行程資料
async function saveItinerary() {
    try {
        setStatus('saving', '儲存中...');
        
        // 收集編輯的資料
        collectEditedData();
        
        // 包含備註資料
        const dataToSave = {
            ...currentItinerary,
            notes: itemNotes
        };
        
        // 真正儲存到伺服器
        const response = await fetch('/api/itinerary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('儲存成功:', result);
        
        setStatus('saved', '已儲存');
        exitEditMode();
    } catch (error) {
        console.error('儲存失敗:', error);
        setStatus('error', '儲存失敗');
        
        // 可選：如果伺服器儲存失敗，暫時存到本地
        try {
            localStorage.setItem('itinerary_backup', JSON.stringify({
                ...currentItinerary,
                notes: itemNotes
            }));
            console.log('已備份到本地儲存');
        } catch (localError) {
            console.error('本地備份也失敗:', localError);
        }
    }
}

// 設定狀態指示器
function setStatus(type, message) {
	const indicator = document.getElementById('statusIndicator');
	indicator.textContent = message;
	indicator.className = 'status-indicator';
	
	if (type === 'saved') {
		indicator.classList.add('status-saved');
	} else if (type === 'saving' || type === 'loading') {
		indicator.classList.add('status-saving');
	}
}

// 切換編輯模式
function toggleEditMode() {
	if (!isEditMode) {
		enterEditMode();
	} else {
		exitEditMode();
	}
}

// 進入編輯模式
function enterEditMode() {
	isEditMode = true;
	originalItinerary = JSON.parse(JSON.stringify(currentItinerary));
	
	document.body.classList.add('edit-mode');
	document.getElementById('editBtn').style.display = 'none';
	document.getElementById('saveBtn').style.display = 'inline-block';
	document.getElementById('cancelBtn').style.display = 'inline-block';
	
	renderItinerary(); // 重新渲染以顯示編輯介面
}

// 退出編輯模式
function exitEditMode() {
	isEditMode = false;
	
	document.body.classList.remove('edit-mode');
	document.getElementById('editBtn').style.display = 'inline-block';
	document.getElementById('saveBtn').style.display = 'none';
	document.getElementById('cancelBtn').style.display = 'none';
	
	renderItinerary();
}

// 取消編輯
function cancelEdit() {
	currentItinerary = originalItinerary;
	exitEditMode();
}

// 讓元素可編輯
function makeEditable() {
	// 標題可編輯
	const title = document.getElementById('title');
	const subtitle = document.getElementById('subtitle');
	
	title.contentEditable = true;
	subtitle.contentEditable = true;
	title.classList.add('editable');
	subtitle.classList.add('editable');
}

// 收集編輯的資料
function collectEditedData() {
	// 更新標題
	currentItinerary.title = document.getElementById('title').textContent;
	currentItinerary.subtitle = document.getElementById('subtitle').textContent;
	
	// 更新各個項目的資料
	currentItinerary.days.forEach(day => {
		day.items.forEach(item => {
			const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
			if (itemElement) {
				const timeEl = itemElement.querySelector('.time-input');
				const nameEl = itemElement.querySelector('.location-name');
				const activityEl = itemElement.querySelector('.location-activity');
				const typeEl = itemElement.querySelector('.type-select');
				
				if (timeEl) item.time = timeEl.value;
				if (nameEl) item.name = nameEl.textContent;
				if (activityEl) item.activity = activityEl.textContent;
				if (typeEl) item.type = typeEl.value;
			}
		});
	});
}

// 渲染行程
function renderItinerary() {
	if (!currentItinerary) return;
	
	const timeline = document.getElementById('timeline');
	const title = document.getElementById('title');
	const subtitle = document.getElementById('subtitle');
	
	title.textContent = currentItinerary.title;
	subtitle.textContent = currentItinerary.subtitle;
	
	timeline.innerHTML = currentItinerary.days.map(day => `
		<div class="day-group">
			<div class="day-header" onclick="toggleDay('${day.id}')">
				<span>${day.date} - ${day.title}</span>
				<span>住宿: ${day.accommodation}</span>
			</div>
			<div class="day-content" id="content-${day.id}" style="display: block;">
				${day.items.map(item => renderTimelineItem(item, day.id)).join('')}
				${isEditMode ? `<button class="add-item-btn" onclick="addNewItem('${day.id}')">+ 新增行程項目</button>` : ''}
			</div>
		</div>
	`).join('');
	
	if (isEditMode) {
		makeEditable();
		addEditableListeners();
	}
}

// 拖拉相關變數
let draggedElement = null;
let draggedData = null;

// 渲染時間軸項目
function renderTimelineItem(item, dayId) {
	const typeClass = `type-${item.type}`;
	const noteCount = getNoteCount(item.id);
	
	if (isEditMode) {
		return `
			<div class="timeline-item" 
				 data-item-id="${item.id}" 
				 data-day-id="${dayId}"
				 draggable="true"
				 ondragstart="handleDragStart(event)"
				 ondragover="handleDragOver(event)" 
				 ondrop="handleDrop(event)"
				 ondragend="handleDragEnd(event)">
				<div class="drag-handle">⋮⋮</div>
				<div class="location-type ${typeClass}"></div>
				<div class="time-section">
					<input type="text" class="time-input" value="${item.time}" placeholder="時間">
				</div>
				<div class="location-section">
					<div class="location-name editable" contenteditable="true">${item.name}</div>
				</div>
				<div class="activity-section">
					<div class="location-activity editable" contenteditable="true">${item.activity}</div>
				</div>
				<select class="type-select">
					<option value="airport" ${item.type === 'airport' ? 'selected' : ''}>機場</option>
					<option value="transport" ${item.type === 'transport' ? 'selected' : ''}>交通</option>
					<option value="city" ${item.type === 'city' ? 'selected' : ''}>城市</option>
					<option value="attraction" ${item.type === 'attraction' ? 'selected' : ''}>景點</option>
					<option value="accommodation" ${item.type === 'accommodation' ? 'selected' : ''}>住宿</option>
					<option value="event" ${item.type === 'event' ? 'selected' : ''}>活動</option>
				</select>
				<div class="notes-section">
					<button class="notes-toggle-btn" onclick="toggleNotes('${item.id}')" data-item-id="${item.id}">
						<span class="notes-icon">📝</span>
						<span class="notes-count ${noteCount === 0 ? 'zero' : ''}">${noteCount}</span>
					</button>
				</div>
				<div class="item-controls">
					<button class="btn btn-danger btn-small" onclick="deleteItem('${item.id}')">刪除</button>
				</div>
				${renderNotesPanel(item.id)}
			</div>
		`;
	} else {
		return `
			<div class="timeline-item" data-item-id="${item.id}">
				<div class="timeline-item-title"> 
					<div class="location-type ${typeClass}"></div>
					<div class="time-section">
						<div class="time-badge">${item.time}</div>
					</div>
				</div>
				<div class="location-section">
					<div class="location-name">${item.name}</div>
				</div>
				<div class="activity-section">
					<div class="location-activity">${item.activity}</div>
				</div>
				<div class="notes-section">
					<button class="notes-toggle-btn" onclick="toggleNotes('${item.id}')" data-item-id="${item.id}">
						<span class="notes-icon">📝</span>
						<span class="notes-count ${noteCount === 0 ? 'zero' : ''}">${noteCount}</span>
					</button>
				</div>
				${renderNotesPanel(item.id)}
			</div>
		`;
	}
}

// 渲染備註面板
function renderNotesPanel(itemId) {
	return `
		<div class="notes-panel" id="notes-${itemId}">
			<div class="notes-panel-header">
				<h4>備註清單</h4>
				<button class="btn btn-small btn-success" onclick="showAddNoteForm('${itemId}')">+ 新增</button>
			</div>
			<div id="note-form-${itemId}" style="display: none;">
				<div class="note-form">
					<div class="note-form-row">
						<select id="priority-${itemId}">
							<option value="high">重要</option>
							<option value="medium" selected>普通</option>
							<option value="low">參考</option>
						</select>
						<input type="text" id="description-${itemId}" placeholder="描述" />
					</div>
					<div class="note-form-row">
						<textarea id="content-${itemId}" placeholder="內容（可以是網址或文字）"></textarea>
					</div>
					<div class="note-form-actions">
						<button class="btn btn-small btn-success" onclick="saveNote('${itemId}')">儲存</button>
						<button class="btn btn-small" onclick="cancelAddNote('${itemId}')">取消</button>
					</div>
				</div>
			</div>
			<div class="notes-table-container">
				<table class="notes-table">
					<tbody id="notes-tbody-${itemId}">
						<!-- 動態載入備註內容 -->
					</tbody>
				</table>
			</div>
		</div>
	`;
}

// 獲取備註數量
function getNoteCount(itemId) {
	return (itemNotes[itemId] || []).length;
}

// 切換備註面板顯示
function toggleNotes(itemId) {
	const panel = document.getElementById(`notes-${itemId}`);
	const btn = document.querySelector(`[onclick="toggleNotes('${itemId}')"]`);
	
	// 先關閉其他所有面板
	document.querySelectorAll('.notes-panel.show').forEach(otherPanel => {
		if (otherPanel.id !== `notes-${itemId}`) {
			otherPanel.classList.remove('show');
			const otherBtn = document.querySelector(`[onclick="toggleNotes('${otherPanel.id.replace('notes-', '')}')"]`);
			if (otherBtn) otherBtn.classList.remove('active');
		}
	});
	
	if (panel.classList.contains('show')) {
		panel.classList.remove('show');
		btn.classList.remove('active');
	} else {
		panel.classList.add('show');
		btn.classList.add('active');
		renderNotesTable(itemId);
	}
}

// 渲染備註表格
function renderNotesTable(itemId) {
	const tbody = document.getElementById(`notes-tbody-${itemId}`);
	const notes = itemNotes[itemId] || [];
	
	if (notes.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="4" class="notes-empty">尚無備註</td>
			</tr>
		`;
		return;
	}
	
	tbody.innerHTML = notes.map(note => `
		<tr>
			<td>
				<span class="priority-tag priority-${note.priority}">
					${priorityConfig[note.priority].label}
				</span>
			</td>
			<td>${note.description}</td>
			<td class="note-content">
				${note.type === 'link' 
					? `<a href="${note.content}" target="_blank" class="note-link">${note.content}</a>`
					: note.content
				}
			</td>
			<td class="note-actions">
				<button class="btn-icon" onclick="editNote('${itemId}', '${note.id}')" title="編輯">✏️</button>
				<button class="btn-icon" onclick="deleteNote('${itemId}', '${note.id}')" title="刪除">🗑️</button>
			</td>
		</tr>
	`).join('');
}

// 顯示新增備註表單
function showAddNoteForm(itemId) {
	const form = document.getElementById(`note-form-${itemId}`);
	form.style.display = 'block';
	
	// 清空表單
	document.getElementById(`priority-${itemId}`).value = 'medium';
	document.getElementById(`description-${itemId}`).value = '';
	document.getElementById(`content-${itemId}`).value = '';
	
	// 聚焦到描述欄位
	document.getElementById(`description-${itemId}`).focus();
}

// 取消新增備註
function cancelAddNote(itemId) {
	const form = document.getElementById(`note-form-${itemId}`);
	form.style.display = 'none';
}

// 儲存備註
async function saveNote(itemId) {
	const priority = document.getElementById(`priority-${itemId}`).value;
	const description = document.getElementById(`description-${itemId}`).value.trim();
	const content = document.getElementById(`content-${itemId}`).value.trim();
	
	if (!description || !content) {
		alert('請填寫描述和內容');
		return;
	}
	
	const newNote = {
		id: `note_${Date.now()}`,
		priority: priority,
		description: description,
		content: content,
		type: content.match(/^https?:\/\//) ? 'link' : 'text'
	};
	
	if (!itemNotes[itemId]) {
		itemNotes[itemId] = [];
	}
	
	itemNotes[itemId].push(newNote);
	renderNotesTable(itemId);
	updateNotesCount(itemId);
	cancelAddNote(itemId);
	
	// 🔥 新增：儲存到資料庫
	try {
		setStatus('saving', '儲存備註中...');
		await saveItinerary(); // 這會包含備註資料一起儲存
		setStatus('saved', '備註已儲存');
	} catch (error) {
		console.error('儲存備註失敗:', error);
		setStatus('error', '儲存備註失敗');
		// 可選：顯示錯誤提示
		alert('儲存備註失敗，請稍後重試');
	}
}

// 編輯備註
async function editNote(itemId, noteId) {
	const note = itemNotes[itemId]?.find(n => n.id === noteId);
	if (!note) return;
	
	const newDescription = prompt('編輯描述：', note.description);
	if (newDescription === null) return;
	
	const newContent = prompt('編輯內容：', note.content);
	if (newContent === null) return;
	
	const newPriority = prompt('重要性（high/medium/low）：', note.priority);
	if (newPriority === null) return;
	
	// 更新本地資料
	note.description = newDescription.trim();
	note.content = newContent.trim();
	note.priority = newPriority || 'medium';
	note.type = note.content.match(/^https?:\/\//) ? 'link' : 'text';
	
	renderNotesTable(itemId);
	
	// 🔥 新增：儲存到資料庫
	try {
		setStatus('saving', '更新備註中...');
		await saveItinerary();
		setStatus('saved', '備註已更新');
	} catch (error) {
		console.error('更新備註失敗:', error);
		setStatus('error', '更新備註失敗');
		alert('更新備註失敗，請稍後重試');
	}
}

// 刪除備註
async function deleteNote(itemId, noteId) {
	if (!confirm('確定要刪除這個備註嗎？')) return;
	
	if (itemNotes[itemId]) {
		itemNotes[itemId] = itemNotes[itemId].filter(note => note.id !== noteId);
		renderNotesTable(itemId);
		updateNotesCount(itemId);
		
		// 🔥 新增：儲存到資料庫
		try {
			setStatus('saving', '刪除備註中...');
			await saveItinerary();
			setStatus('saved', '備註已刪除');
		} catch (error) {
			console.error('刪除備註失敗:', error);
			setStatus('error', '刪除備註失敗');
			alert('刪除備註失敗，請稍後重試');
		}
	}
}

// 更新備註數量顯示
function updateNotesCount(itemId) {
	const countEl = document.querySelector(`[onclick="toggleNotes('${itemId}')"] .notes-count`);
	if (countEl) {
		const count = getNoteCount(itemId);
		countEl.textContent = count;
		countEl.className = `notes-count ${count === 0 ? 'zero' : ''}`;
	}
}

// 🔥 拖拉功能相關函數
// 開始拖拉
function handleDragStart(event) {
	draggedElement = event.target.closest('.timeline-item');
	draggedData = {
		itemId: draggedElement.dataset.itemId,
		dayId: draggedElement.dataset.dayId
	};
	
	// 視覺效果
	draggedElement.classList.add('dragging');
	event.dataTransfer.effectAllowed = 'move';
	
	console.log('開始拖拉:', draggedData);
}

// 拖拉經過
function handleDragOver(event) {
	event.preventDefault();
	event.dataTransfer.dropEffect = 'move';
	
	const targetItem = event.target.closest('.timeline-item');
	if (targetItem && targetItem !== draggedElement && targetItem.dataset.itemId) {
		// 清除所有其他項目的指示
		document.querySelectorAll('.timeline-item').forEach(item => {
			item.classList.remove('drop-before', 'drop-after');
		});
		
		// 顯示插入位置指示
		const rect = targetItem.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		
		if (event.clientY < midpoint) {
			targetItem.classList.add('drop-before');
		} else {
			targetItem.classList.add('drop-after');
		}
	}
}

// 放下
function handleDrop(event) {
	event.preventDefault();
	
	const targetItem = event.target.closest('.timeline-item');
	if (targetItem && targetItem !== draggedElement && targetItem.dataset.itemId) {
		const targetData = {
			itemId: targetItem.dataset.itemId,
			dayId: targetItem.dataset.dayId
		};
		
		// 判斷插入位置
		const rect = targetItem.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		const insertBefore = event.clientY < midpoint;
		
		console.log('拖拉放下:', { draggedData, targetData, insertBefore });
		
		// 執行重新排序
		reorderItems(draggedData, targetData, insertBefore);
	}
	
	// 清理視覺效果
	cleanupDragVisuals();
}

// 拖拉結束
function handleDragEnd(event) {
	cleanupDragVisuals();
}

// 清理視覺效果
function cleanupDragVisuals() {
	if (draggedElement) {
		draggedElement.classList.remove('dragging');
	}
	
	document.querySelectorAll('.timeline-item').forEach(item => {
		item.classList.remove('drop-before', 'drop-after');
	});
	
	draggedElement = null;
	draggedData = null;
}

// 重新排序邏輯
function reorderItems(draggedData, targetData, insertBefore) {
	console.log('執行重新排序:', { draggedData, targetData, insertBefore });
	
	const sourceDay = currentItinerary.days.find(d => d.id === draggedData.dayId);
	const targetDay = currentItinerary.days.find(d => d.id === targetData.dayId);
	
	if (!sourceDay || !targetDay) {
		console.error('找不到日期:', { sourceDay, targetDay });
		return;
	}
	
	// 找到要移動的項目
	const draggedIndex = sourceDay.items.findIndex(item => item.id === draggedData.itemId);
	const draggedItem = sourceDay.items[draggedIndex];
	
	if (!draggedItem) {
		console.error('找不到拖拉項目');
		return;
	}
	
	// 從原位置移除
	sourceDay.items.splice(draggedIndex, 1);
	
	// 找到目標位置
	const targetIndex = targetDay.items.findIndex(item => item.id === targetData.itemId);
	const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
	
	// 插入到新位置
	targetDay.items.splice(insertIndex, 0, draggedItem);
	
	console.log('重新排序完成，重新渲染...');
	
	// 重新渲染
	renderItinerary();
	
	// 自動儲存
	// setTimeout(() => {
	//	console.log('自動儲存...');
	//	saveItinerary();
	// }, 300);
}

// 新增項目
function addNewItem(dayId) {
	const newItem = {
		id: `item${Date.now()}`,
		type: 'attraction',
		time: '00:00',
		name: '新景點',
		activity: '請編輯活動內容'
	};
	
	const day = currentItinerary.days.find(d => d.id === dayId);
	if (day) {
		day.items.push(newItem);
		renderItinerary();
	}
}

// 刪除項目
function deleteItem(itemId) {
	if (confirm('確定要刪除這個項目嗎？相關備註也會被刪除。')) {
		// 刪除項目
		currentItinerary.days.forEach(day => {
			day.items = day.items.filter(item => item.id !== itemId);
		});
		
		// 刪除相關備註
		delete itemNotes[itemId];
		
		renderItinerary();
	}
}

// 切換日期顯示
function toggleDay(dayId) {
	const content = document.getElementById(`content-${dayId}`);
	const header = document.querySelector(`[onclick="toggleDay('${dayId}')"]`);
	const isOpen = content.style.display !== 'none';
	
	if (isOpen) {
		content.style.display = 'none';
		header.classList.add('collapsed');
	} else {
		content.style.display = 'block';
		header.classList.remove('collapsed');
	}
}

// 添加編輯監聽器
function addEditableListeners() {
	// 類型選擇器變更事件
	document.querySelectorAll('.type-select').forEach(select => {
		select.addEventListener('change', function() {
			const item = this.closest('.timeline-item');
			const colorDiv = item.querySelector('.location-type');
			colorDiv.className = `location-type type-${this.value}`;
		});
	});
}

// 鍵盤快捷鍵
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
            e.preventDefault();
            if (isEditMode) {
                saveItinerary();
            }
        } else if (e.key === 'e') {
            e.preventDefault();
            toggleEditMode();
        }
    }
    
    // ESC 鍵關閉所有備註面板
    if (e.key === 'Escape') {
        document.querySelectorAll('.notes-panel.show').forEach(panel => {
            panel.classList.remove('show');
        });
        document.querySelectorAll('.notes-toggle-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
    }
});

// 點擊頁面其他地方關閉備註面板
document.addEventListener('click', function(e) {
    // 如果點擊的不是備註按鈕或備註面板內容，就關閉面板
    if (!e.target.closest('.notes-section') && !e.target.closest('.notes-panel')) {
        document.querySelectorAll('.notes-panel.show').forEach(panel => {
            panel.classList.remove('show');
        });
        document.querySelectorAll('.notes-toggle-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
    }
});

// 導出給全域使用的函數
window.itinerary = {
    loadItinerary,
    saveItinerary,
    toggleEditMode,
    addNewItem,
    deleteItem,
    toggleDay,
    toggleNotes,
    addNote: showAddNoteForm,
    editNote,
    deleteNote
};