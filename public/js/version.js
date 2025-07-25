// version.js - 版本資訊管理

class VersionManager {
    constructor() {
        this.currentVersion = null;
        this.changelogContent = null;
    }
    
    // 載入版本資訊
    async loadVersionInfo() {
        try {
            const response = await fetch('/api/version');
            if (response.ok) {
                this.currentVersion = await response.json();
                this.updateVersionDisplay();
            } else {
                console.error('無法載入版本資訊');
                this.updateVersionDisplay({ version: '未知版本' });
            }
        } catch (error) {
            console.error('載入版本資訊失敗:', error);
            this.updateVersionDisplay({ version: '載入失敗' });
        }
    }
    
    // 更新版本顯示
    updateVersionDisplay(versionInfo = null) {
        const versionElement = document.getElementById('versionInfo');
        if (versionElement) {
            const version = versionInfo || this.currentVersion;
            versionElement.innerHTML = `<span>v${version.version}</span>`;
        }
    }
    
    // 載入更新日誌
    async loadChangelog() {
        if (this.changelogContent) {
            return this.changelogContent;
        }
        
        try {
            const response = await fetch('/CHANGELOG.md');
            if (response.ok) {
                const markdown = await response.text();
                this.changelogContent = this.convertMarkdownToHtml(markdown);
                return this.changelogContent;
            } else {
                return '<p>無法載入更新日誌</p>';
            }
        } catch (error) {
            console.error('載入更新日誌失敗:', error);
            return '<p>載入更新日誌失敗</p>';
        }
    }
    
    // 簡單的 Markdown 轉 HTML
    convertMarkdownToHtml(markdown) {
        return markdown
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }
    
    // 顯示更新日誌
    async showChangelog() {
        const modal = document.getElementById('changelogModal');
        const body = document.getElementById('changelogBody');
        
        if (modal && body) {
            modal.classList.add('show');
            body.innerHTML = '載入中...';
            
            const content = await this.loadChangelog();
            body.innerHTML = content;
        }
    }
    
    // 隱藏更新日誌
    hideChangelog() {
        const modal = document.getElementById('changelogModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

// 全域版本管理器
window.versionManager = new VersionManager();

// 全域函數供 HTML 調用
window.showChangelog = () => window.versionManager.showChangelog();
window.hideChangelog = () => window.versionManager.hideChangelog();

// 使用說明模態框控制函數
window.toggleHelp = () => {
    const modal = document.getElementById('helpModal');
    if (modal) {
        if (modal.classList.contains('show')) {
            hideHelp();
        } else {
            showHelp();
        }
    }
};

window.showHelp = () => {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.add('show');
    }
};

window.hideHelp = () => {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// 頁面載入時初始化版本資訊
document.addEventListener('DOMContentLoaded', function() {
    window.versionManager.loadVersionInfo();
});

// 點擊模態框背景關閉
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('changelog-modal')) {
        window.versionManager.hideChangelog();
    }
    if (e.target.classList.contains('help-modal')) {
        window.hideHelp();
    }
});

// ESC 鍵關閉模態框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        window.versionManager.hideChangelog();
        window.hideHelp();
    }
});