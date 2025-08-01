# Release Notes - Japan Kansai Shikoku Travel Itinerary

## v1.1.1 (2024-XX-XX) - PATCH
**優化按鈕布局和使用者體驗**
- 優化按鈕布局：將編輯控制按鈕改為固定浮動在右上角
- 實現智能備註儲存機制：根據編輯模式調整儲存行為  
- 完善備註面板狀態保持機制
- 修復備註儲存時面板自動關閉的問題

## v1.1.0 (2024-XX-XX) - MINOR  
**新增備註功能和界面優化**
- 新增版本號系統和更新日誌功能
- 修復備註新增時的實時通知問題
- 優化更新日誌顯示效果
- 優化界面布局：置中行程並改進使用說明
- 修復更新日誌重複標題問題

## v1.0.0 (2024-XX-XX) - MAJOR
**核心功能完整實現**

### 🆕 新功能 (MINOR級別變更)
- **線上編輯功能**：完整的即時編輯系統
- **PostgreSQL 資料庫**：從檔案系統遷移到資料庫儲存
- **即時通知系統**：使用 Server-Sent Events 實現即時資料同步
- **備註系統**：支援多優先級備註功能
- **拖拉排序**：支援行程項目拖拉重新排序
- **檔案分離**：將單一檔案重構為模組化架構

### 🔧 修復和優化 (PATCH級別變更)
- 修復 package.json 版本衝突
- 修復 package-lock.json 相關問題  
- 修復 saveItineraryToDb() 函數
- 關閉拖拉自動儲存機制
- 新增 CLAUDE.md 專案文檔

### 🏗️ 技術架構變更 (MAJOR級別變更)
- **資料庫遷移**：從 JSON 檔案遷移到 PostgreSQL
- **模組化重構**：分離 HTML/CSS/JS 到獨立檔案
- **即時通信**：實現 WebSocket 式的即時資料同步
- **API 設計**：建立完整的 RESTful API

---

## 版本控制說明

本專案採用[語義化版本控制](https://semver.org/lang/zh-TW/)：

- **MAJOR (X.0.0)**：破壞性變更，不向後兼容
- **MINOR (1.X.0)**：新功能，向後兼容  
- **PATCH (1.1.X)**：錯誤修復，向後兼容

## 技術棧

### 後端
- Node.js + Express.js
- PostgreSQL 資料庫
- Server-Sent Events (SSE)

### 前端  
- 原生 HTML/CSS/JavaScript
- 即時資料同步
- 拖拉排序功能
- 響應式設計

## 安裝和使用

```bash
# 安裝相依套件
npm install

# 啟動應用程式
npm start
# 或
npm run dev

# 應用程式將在 http://localhost:3000 啟動
```

## 環境變數

- `DATABASE_URL`: PostgreSQL 連線字串（生產環境必需）
- `PORT`: 伺服器連接埠（預設 3000）
- `NODE_ENV`: 環境設定