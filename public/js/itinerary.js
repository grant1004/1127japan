let currentItinerary = null;
let isEditMode = false;
let originalItinerary = null;


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
				currentItinerary = await response.json();
			} else {
				throw new Error('API not available');
			}
		} catch (apiError) {
			console.log('API載入失敗，使用預設資料:', apiError.message);
			currentItinerary = defaultItinerary;
		}
		
		renderItinerary();
		setStatus('saved', '已載入');
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
        
        // 真正儲存到伺服器
        const response = await fetch('/api/itinerary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentItinerary)
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
            localStorage.setItem('itinerary_backup', JSON.stringify(currentItinerary));
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
				${day.items.map(item => renderTimelineItem(item)).join('')}
				${isEditMode ? `<button class="add-item-btn" onclick="addNewItem('${day.id}')">+ 新增行程項目</button>` : ''}
			</div>
		</div>
	`).join('');
	
	if (isEditMode) {
		makeEditable();
		addEditableListeners();
	}
}

// 渲染時間軸項目
function renderTimelineItem(item) {
	const typeClass = `type-${item.type}`;
	
	if (isEditMode) {
		return `
			<div class="timeline-item" data-item-id="${item.id}">
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
				<div class="item-controls">
					<button class="btn btn-danger btn-small" onclick="deleteItem('${item.id}')">刪除</button>
				</div>
			</div>
		`;
	} else {
		return `
			<div class="timeline-item" data-item-id="${item.id}">
				<div class="location-type ${typeClass}"></div>
				<div class="time-section">
					<div class="time-badge">${item.time}</div>
				</div>
				<div class="location-section">
					<div class="location-name">${item.name}</div>
				</div>
				<div class="activity-section">
					<div class="location-activity">${item.activity}</div>
				</div>
			</div>
		`;
	}
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
	if (confirm('確定要刪除這個項目嗎？')) {
		currentItinerary.days.forEach(day => {
			day.items = day.items.filter(item => item.id !== itemId);
		});
		renderItinerary();
	}
}

// 切換日期顯示
function toggleDay(dayId) {
	const content = document.getElementById(`content-${dayId}`);
	const header = document.querySelector(`[onclick="toggleDay('${dayId}')"]`);  // 👈 新增：找到標題元素
	const isOpen = content.style.display !== 'none';
	
	if (isOpen) {
		content.style.display = 'none';
		header.classList.add('collapsed');     // 👈 新增：添加收合樣式
	} else {
		content.style.display = 'block';
		header.classList.remove('collapsed');  // 👈 新增：移除收合樣式
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
});

// 導出給全域使用的函數
window.itinerary = {
    loadItinerary,
    saveItinerary,
    toggleEditMode,
    addNewItem,
    deleteItem,
    toggleDay
};

