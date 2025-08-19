window.currentItinerary = null;
window.isEditMode = false;
let originalItinerary = null;

// 備註資料結構 - 設定為全域變數以供通知系統使用
window.itemNotes = {
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
				window.currentItinerary = {
					title: data.title,
					subtitle: data.subtitle,
					days: data.days
				};
				
				// 🔥 修正：備註資料直接從 API 回應中獲取
				window.itemNotes = data.notes || {};
				
				console.log('✅ 從 API 載入資料:', { 
					title: data.title, 
					daysCount: data.days?.length, 
					notesCount: Object.keys(window.itemNotes).length 
				});
			} else {
				throw new Error('API not available');
			}
		} catch (apiError) {
			console.log('API載入失敗，使用預設資料:', apiError.message);
			window.currentItinerary = defaultItinerary;
			// 使用預設備註資料
			window.itemNotes = {
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
		console.log('📝 載入的備註資料:', window.itemNotes);
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
            ...window.currentItinerary,
            notes: window.itemNotes
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
        if (window.isEditMode) {
            exitEditMode();
        }
    } catch (error) {
        console.error('儲存失敗:', error);
        setStatus('error', '儲存失敗');
        
        // 可選：如果伺服器儲存失敗，暫時存到本地
        try {
            localStorage.setItem('itinerary_backup', JSON.stringify({
                ...window.currentItinerary,
                notes: window.itemNotes
            }));
            console.log('已備份到本地儲存');
        } catch (localError) {
            console.error('本地備份也失敗:', localError);
        }
    }
}

// 專門用於備註的儲存函數 - 不會觸發 exitEditMode
async function saveNotesOnly() {
    try {
        setStatus('saving', '儲存備註中...');
        
        // 包含備註資料
        const dataToSave = {
            ...window.currentItinerary,
            notes: window.itemNotes
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
        console.log('備註儲存成功:', result);
        
        setStatus('saved', '備註已儲存');
        // 注意：這裡不調用 exitEditMode()
        
    } catch (error) {
        console.error('儲存備註失敗:', error);
        setStatus('error', '儲存備註失敗');
        throw error; // 重新拋出錯誤供調用者處理
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
	if (!window.isEditMode) {
		enterEditMode();
	} else {
		exitEditMode();
	}
}

// 進入編輯模式
function enterEditMode() {
	window.isEditMode = true;
	originalItinerary = JSON.parse(JSON.stringify(window.currentItinerary));
	
	document.body.classList.add('edit-mode');
	document.getElementById('editBtn').style.display = 'none';
	document.getElementById('saveBtn').style.display = 'inline-block';
	document.getElementById('cancelBtn').style.display = 'inline-block';
	
	renderItinerary(); // 重新渲染以顯示編輯介面
}

// 退出編輯模式
function exitEditMode() {
	window.isEditMode = false;
	
	document.body.classList.remove('edit-mode');
	document.getElementById('editBtn').style.display = 'inline-block';
	document.getElementById('saveBtn').style.display = 'none';
	document.getElementById('cancelBtn').style.display = 'none';
	
	renderItinerary();
}

// 取消編輯
function cancelEdit() {
	window.currentItinerary = originalItinerary;
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
	window.currentItinerary.title = document.getElementById('title').textContent;
	window.currentItinerary.subtitle = document.getElementById('subtitle').textContent;
	
	// 更新各個項目的資料
	window.currentItinerary.days.forEach(day => {
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

// 渲染行程 - 設定為全域函數以供通知系統使用
window.renderItinerary = function renderItinerary() {
	if (!window.currentItinerary) return;
	
	const timeline = document.getElementById('timeline');
	const title = document.getElementById('title');
	const subtitle = document.getElementById('subtitle');
	
	title.textContent = window.currentItinerary.title;
	subtitle.textContent = window.currentItinerary.subtitle;
	
	timeline.innerHTML = window.currentItinerary.days.map(day => `
		<div class="day-group">
			<div class="day-header" onclick="toggleDay('${day.id}')">
				<span>${day.date} - ${day.title}</span>
				<span>住宿: ${day.accommodation}</span>
			</div>
			<div class="day-content" id="content-${day.id}" style="display: block;">
				${day.items.map(item => renderTimelineItem(item, day.id)).join('')}
				${window.isEditMode ? `<button class="add-item-btn" onclick="addNewItem('${day.id}')">+ 新增行程項目</button>` : ''}
			</div>
		</div>
	`).join('');
	
	if (window.isEditMode) {
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
	
	if (window.isEditMode) {
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
	return (window.itemNotes[itemId] || []).length;
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

// 渲染備註表格 - 設為全域函數供通知系統使用
window.renderNotesTable = function renderNotesTable(itemId) {
	const tbody = document.getElementById(`notes-tbody-${itemId}`);
	const notes = window.itemNotes[itemId] || [];
	
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

// 顯示新增備註表單 - 設為全域函數供通知系統使用
window.showAddNoteForm = function showAddNoteForm(itemId) {
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
	
	if (!window.itemNotes[itemId]) {
		window.itemNotes[itemId] = [];
	}
	
	window.itemNotes[itemId].push(newNote);
	renderNotesTable(itemId);
	updateNotesCount(itemId);
	cancelAddNote(itemId);
	
	// 🔥 新邏輯：根據編輯模式決定是否立即儲存
	if (!window.isEditMode) {
		// 非編輯模式：立即自動儲存
		try {
			await saveNotesOnly();
		} catch (error) {
			console.error('儲存備註失敗:', error);
			alert('儲存備註失敗，請稍後重試');
		}
	}
	// 編輯模式：不儲存，等待用戶點擊「儲存」按鈕
}

// 編輯備註
async function editNote(itemId, noteId) {
	const note = window.itemNotes[itemId]?.find(n => n.id === noteId);
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
	
	// 🔥 新邏輯：根據編輯模式決定是否立即儲存
	if (!window.isEditMode) {
		// 非編輯模式：立即自動儲存
		try {
			await saveNotesOnly();
		} catch (error) {
			console.error('更新備註失敗:', error);
			alert('更新備註失敗，請稍後重試');
		}
	}
	// 編輯模式：不儲存，等待用戶點擊「儲存」按鈕
}

// 刪除備註
async function deleteNote(itemId, noteId) {
	if (!confirm('確定要刪除這個備註嗎？')) return;
	
	if (window.itemNotes[itemId]) {
		window.itemNotes[itemId] = window.itemNotes[itemId].filter(note => note.id !== noteId);
		renderNotesTable(itemId);
		updateNotesCount(itemId);
		
		// 🔥 新邏輯：根據編輯模式決定是否立即儲存
		if (!window.isEditMode) {
			// 非編輯模式：立即自動儲存
			try {
				await saveNotesOnly();
			} catch (error) {
				console.error('刪除備註失敗:', error);
				alert('刪除備註失敗，請稍後重試');
			}
		}
		// 編輯模式：不儲存，等待用戶點擊「儲存」按鈕
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
	
	const sourceDay = window.currentItinerary.days.find(d => d.id === draggedData.dayId);
	const targetDay = window.currentItinerary.days.find(d => d.id === targetData.dayId);
	
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
	
	const day = window.currentItinerary.days.find(d => d.id === dayId);
	if (day) {
		day.items.push(newItem);
		renderItinerary();
	}
}

// 刪除項目
function deleteItem(itemId) {
	if (confirm('確定要刪除這個項目嗎？相關備註也會被刪除。')) {
		// 刪除項目
		window.currentItinerary.days.forEach(day => {
			day.items = day.items.filter(item => item.id !== itemId);
		});
		
		// 刪除相關備註
		delete window.itemNotes[itemId];
		
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
            if (window.isEditMode) {
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

// 暫時資訊管理系統
window.tempNotes = [];

// 載入暫時資訊 - 從伺服器
async function loadTempNotes() {
	try {
		console.log('📝 開始載入暫時資訊...');
		
		// 先嘗試從伺服器載入
		try {
			const response = await fetch('/api/temp-notes');
			if (response.ok) {
				const serverNotes = await response.json();
				window.tempNotes = serverNotes;
				console.log(`✅ 從伺服器載入了 ${serverNotes.length} 個暫時資訊`);
			} else {
				throw new Error('伺服器無法取得暫時資訊');
			}
		} catch (apiError) {
			console.log('⚠️ 無法從伺服器載入，嘗試 localStorage:', apiError.message);
			// 如果伺服器失敗，使用 localStorage 作為備用
			const saved = localStorage.getItem('tempNotes');
			if (saved) {
				window.tempNotes = JSON.parse(saved);
				console.log(`📦 從本地載入了 ${window.tempNotes.length} 個暫時資訊`);
			} else {
				window.tempNotes = [];
			}
		}
		
		renderTempNotes();
	} catch (error) {
		console.error('載入暫時資訊失敗:', error);
		window.tempNotes = [];
		renderTempNotes();
	}
}

// 儲存暫時資訊 - 同步到伺服器
async function saveTempNote(noteData) {
	try {
		// 先儲存到伺服器
		const response = await fetch('/api/temp-notes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(noteData)
		});
		
		if (!response.ok) {
			throw new Error('伺服器儲存失敗');
		}
		
		console.log('✅ 暫時資訊已同步到伺服器');
		return true;
		
	} catch (error) {
		console.error('同步到伺服器失敗:', error);
		
		// 如果伺服器失敗，至少存到 localStorage
		try {
			localStorage.setItem('tempNotes', JSON.stringify(window.tempNotes));
			console.log('💾 已備份到 localStorage');
		} catch (localError) {
			console.error('本地備份也失敗:', localError);
		}
		
		throw error; // 重新拋出錯誤讓調用者知道
	}
}

// 刪除暫時資訊 - 從伺服器
async function deleteTempNoteFromServer(noteId) {
	try {
		const response = await fetch(`/api/temp-notes/${noteId}`, {
			method: 'DELETE'
		});
		
		if (!response.ok) {
			throw new Error('伺服器刪除失敗');
		}
		
		console.log('✅ 暫時資訊已從伺服器刪除');
		return true;
		
	} catch (error) {
		console.error('從伺服器刪除失敗:', error);
		
		// 如果伺服器失敗，至少從本地刪除
		try {
			window.tempNotes = window.tempNotes.filter(note => note.id !== noteId);
			localStorage.setItem('tempNotes', JSON.stringify(window.tempNotes));
			console.log('💾 已從本地刪除');
		} catch (localError) {
			console.error('本地刪除也失敗:', localError);
		}
		
		throw error;
	}
}

// 渲染暫時資訊列表
function renderTempNotes() {
	const container = document.getElementById('tempNotesContent');
	
	if (window.tempNotes.length === 0) {
		container.innerHTML = `
			<div class="temp-notes-placeholder">
				尚無暫時資訊
			</div>
		`;
		return;
	}
	
	container.innerHTML = window.tempNotes.map(note => `
		<div class="temp-note-item" data-id="${note.id}">
			<div class="temp-note-title">
				<span>${note.title}</span>
				<div class="temp-note-actions">
					<button class="btn-icon" onclick="editTempNote('${note.id}')" title="編輯">✏️</button>
					<button class="btn-icon" onclick="deleteTempNote('${note.id}')" title="刪除">🗑️</button>
				</div>
			</div>
			<div class="temp-note-content">
				${note.type === 'link' 
					? `<a href="${note.content}" target="_blank" class="temp-note-link">${note.content}</a>`
					: note.content
				}
			</div>
		</div>
	`).join('');
}

// 顯示新增表單
function showAddTempNoteForm() {
	const form = document.getElementById('tempNoteForm');
	form.style.display = 'block';
	
	// 清空表單
	document.getElementById('tempNoteTitle').value = '';
	document.getElementById('tempNoteContent').value = '';
	
	// 聚焦到標題欄位
	document.getElementById('tempNoteTitle').focus();
}

// 取消新增
function cancelAddTempNote() {
	const form = document.getElementById('tempNoteForm');
	form.style.display = 'none';
}

// 儲存暫時資訊
async function saveTempNoteFromForm() {
	const title = document.getElementById('tempNoteTitle').value.trim();
	const content = document.getElementById('tempNoteContent').value.trim();
	
	if (!title || !content) {
		alert('請填寫標題和內容');
		return;
	}
	
	const newNote = {
		id: `temp_${Date.now()}`,
		title: title,
		content: content,
		type: content.match(/^https?:\/\//) ? 'link' : 'text',
		createdAt: new Date().toISOString()
	};
	
	try {
		// 先更新本地資料
		window.tempNotes.unshift(newNote);
		
		// 同步到伺服器
		await saveTempNote(newNote);
		
		// 成功後更新 UI
		renderTempNotes();
		cancelAddTempNote();
		
		console.log('✅ 暫時資訊已新增');
	} catch (error) {
		// 如果伺服器失敗，仍然顯示本地變更，但給用戶警告
		renderTempNotes();
		cancelAddTempNote();
		
		console.error('新增暫時資訊失敗:', error);
		if (window.notification && window.notification.showNotification) {
			window.notification.showNotification('⚠️ 暫時資訊已新增，但未能同步到伺服器', 'warning', 5000);
		}
	}
}

// 編輯暫時資訊
async function editTempNote(noteId) {
	const note = window.tempNotes.find(n => n.id === noteId);
	if (!note) return;
	
	const newTitle = prompt('編輯標題：', note.title);
	if (newTitle === null) return;
	
	const newContent = prompt('編輯內容：', note.content);
	if (newContent === null) return;
	
	if (!newTitle.trim() || !newContent.trim()) {
		alert('標題和內容不能為空');
		return;
	}
	
	// 備份原始資料
	const originalTitle = note.title;
	const originalContent = note.content;
	const originalType = note.type;
	
	// 更新本地資料
	note.title = newTitle.trim();
	note.content = newContent.trim();
	note.type = note.content.match(/^https?:\/\//) ? 'link' : 'text';
	note.updatedAt = new Date().toISOString();
	
	try {
		// 同步到伺服器
		await saveTempNote(note);
		
		// 成功後更新 UI
		renderTempNotes();
		console.log('✅ 暫時資訊已更新');
	} catch (error) {
		// 如果失敗，恢復原始資料
		note.title = originalTitle;
		note.content = originalContent;
		note.type = originalType;
		
		renderTempNotes();
		console.error('更新暫時資訊失敗:', error);
		
		if (window.notification && window.notification.showNotification) {
			window.notification.showNotification('⚠️ 更新失敗，請稍後重試', 'error', 3000);
		} else {
			alert('更新失敗，請稍後重試');
		}
	}
}

// 刪除暫時資訊
async function deleteTempNote(noteId) {
	if (!confirm('確定要刪除這個暫時資訊嗎？')) return;
	
	// 備份原始資料（以防需要恢復）
	const originalNotes = [...window.tempNotes];
	
	// 先從本地移除
	window.tempNotes = window.tempNotes.filter(note => note.id !== noteId);
	
	try {
		// 同步到伺服器
		await deleteTempNoteFromServer(noteId);
		
		// 成功後更新 UI
		renderTempNotes();
		console.log('✅ 暫時資訊已刪除');
	} catch (error) {
		// 如果失敗，恢復原始資料
		window.tempNotes = originalNotes;
		
		renderTempNotes();
		console.error('刪除暫時資訊失敗:', error);
		
		if (window.notification && window.notification.showNotification) {
			window.notification.showNotification('⚠️ 刪除失敗，請稍後重試', 'error', 3000);
		} else {
			alert('刪除失敗，請稍後重試');
		}
	}
}

// 在頁面載入時初始化暫時資訊
document.addEventListener('DOMContentLoaded', function() {
	// 延遲載入以確保主要功能先載入完成
	setTimeout(() => {
		loadTempNotes();
	}, 100);
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

// 暫時資訊功能導出
window.tempNotesManager = {
	loadTempNotes,
	renderTempNotes,
	showAddTempNoteForm,
	cancelAddTempNote,
	saveTempNoteFromForm,
	editTempNote,
	deleteTempNote
};