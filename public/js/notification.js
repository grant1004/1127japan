// public/js/notification.js

class DatabaseNotificationClient {
    constructor() {
        this.eventSource = null;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.isConnected = false;
    }

    start() {
        this.connect();
    }

    connect() {
        try {
            this.eventSource = new EventSource('/api/events');
            
            this.eventSource.onopen = () => {
                console.log('✅ 實時通知連接成功');
                this.isConnected = true;
                this.reconnectDelay = 1000; // 重置重連延遲
                this.showConnectionStatus('已連線', 'success');
            };
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleNotification(data);
                } catch (error) {
                    console.error('解析通知失敗:', error);
                }
            };
            
            this.eventSource.onerror = () => {
                console.log('❌ 實時通知連接出錯，準備重連...');
                this.isConnected = false;
                this.eventSource.close();
                this.showConnectionStatus('連線中斷', 'error');
                this.scheduleReconnect();
            };
            
        } catch (error) {
            console.error('建立通知連接失敗:', error);
            this.scheduleReconnect();
        }
    }

    handleNotification(data) {
        switch(data.type) {
            case 'connected':
                console.log('🔔 通知系統已連接');
                break;
                
            case 'itinerary_updated':
                console.log('📝 行程資料已更新');
                this.refreshItinerary();
                this.showUpdateNotification();
                break;
                
            case 'heartbeat':
                // 靜默處理心跳
                break;
                
            case 'server_shutdown':
                console.log('🔄 伺服器重啟中...');
                this.showConnectionStatus('伺服器重啟中', 'warning');
                break;
                
            default:
                console.log('收到未知通知類型:', data.type);
        }
    }

    async refreshItinerary() {
        try {
            // 檢查是否正在編輯模式
            if (window.isEditMode) {
                this.showConflictNotification();
                return;
            }

            const response = await fetch('/api/itinerary');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const newData = await response.json();
            
            // 只有當資料真的不同時才更新
            if (JSON.stringify(newData) !== JSON.stringify(window.currentItinerary)) {
                window.currentItinerary = newData;
                
                // 🔥 修復：同步更新備註資料
                if (newData.notes) {
                    window.itemNotes = newData.notes;
                }
                
                // 調用渲染函數更新 UI
                if (typeof renderItinerary === 'function') {
                    renderItinerary();
                } else if (window.renderItinerary) {
                    window.renderItinerary();
                } else {
                    console.error('找不到 renderItinerary 函數');
                }
            }
        } catch (error) {
            console.error('重新載入行程失敗:', error);
        }
    }

    showUpdateNotification() {
        this.showNotification('📝 行程已更新！', 'success');
    }

    showConflictNotification() {
        this.showNotification('⚠️ 其他用戶正在編輯，請先儲存您的變更', 'warning', 5000);
    }

    showConnectionStatus(message, type) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `connection-status ${type}`;
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        // 移除現有通知
        const existingNotification = document.querySelector('.update-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 創建新通知
        const notification = document.createElement('div');
        notification.className = `update-notification ${type}`;
        notification.innerHTML = message;
        
        // 添加點擊關閉功能
        notification.addEventListener('click', () => {
            notification.remove();
        });
        
        document.body.appendChild(notification);
        
        // 自動移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    scheduleReconnect() {
        this.showConnectionStatus('重新連線中...', 'warning');
        
        setTimeout(() => {
            this.reconnectDelay = Math.min(
                this.reconnectDelay * 1.5, 
                this.maxReconnectDelay
            );
            this.connect();
        }, this.reconnectDelay);
    }

    // 手動關閉連接
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.isConnected = false;
            console.log('🔌 通知連接已關閉');
        }
    }

    // 檢查連接狀態
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: this.eventSource ? this.eventSource.readyState : -1
        };
    }
}

// 網路狀態監控
class NetworkMonitor {
    constructor(notificationClient) {
        this.notificationClient = notificationClient;
        this.isOnline = navigator.onLine;
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 網路連線恢復');
            this.isOnline = true;
            this.notificationClient.showNotification('網路連線已恢復', 'success');
            
            // 重新連接通知系統
            if (!this.notificationClient.isConnected) {
                this.notificationClient.connect();
            }
        });

        window.addEventListener('offline', () => {
            console.log('📴 網路連線中斷');
            this.isOnline = false;
            this.notificationClient.showNotification('網路連線中斷', 'error', 5000);
        });
    }

    getStatus() {
        return this.isOnline;
    }
}

// 初始化通知客戶端
let notificationClient = null;
let networkMonitor = null;

// 當 DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化通知客戶端
    notificationClient = new DatabaseNotificationClient();
    
    // 初始化網路監控
    networkMonitor = new NetworkMonitor(notificationClient);
    
    console.log('📱 通知系統初始化完成');
});

// 頁面卸載時清理資源
window.addEventListener('beforeunload', function() {
    if (notificationClient) {
        notificationClient.disconnect();
    }
});

// 導出給其他模組使用
window.notification = {
    client: () => notificationClient,
    network: () => networkMonitor,
    showNotification: (message, type, duration) => {
        if (notificationClient) {
            notificationClient.showNotification(message, type, duration);
        }
    }
};