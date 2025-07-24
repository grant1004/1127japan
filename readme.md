# 日本關西四國行程 - 線上編輯版

這是一個支援線上編輯和雲端同步的旅遊行程管理系統。

## 功能特色

### ✨ 主要功能
- **即時編輯**: 點擊「編輯模式」即可直接修改行程內容
- **雲端儲存**: 所有修改會自動儲存到伺服器
- **即時同步**: 多人可同時檢視最新的行程內容
- **響應式設計**: 支援手機、平板、電腦各種螢幕尺寸

### 🛠 編輯功能
- 修改標題和日期
- 編輯每個行程項目的時間、地點、活動內容
- 變更項目類型（機場、交通、城市、景點、住宿、活動）
- 新增新的行程項目
- 刪除不需要的項目
- 快速儲存功能

## 安裝和啟動

### 1. 安裝依賴
```bash
npm install
```

### 2. 啟動伺服器
```bash
npm start
```

### 3. 開啟瀏覽器
訪問 `http://localhost:3000`

## 使用說明

### 檢視模式
- 預設為檢視模式，可以瀏覽完整的行程
- 點擊日期標題可以摺疊/展開該日的行程

### 編輯模式
1. 點擊右上角的「編輯模式」按鈕
2. 行程內容變成可編輯狀態
3. 直接點擊要修改的文字進行編輯
4. 使用下拉選單變更項目類型
5. 點擊「+ 新增行程項目」來添加新項目
6. 點擊「刪除」按鈕來移除項目

### 儲存功能
- **手動儲存**: 點擊「儲存」按鈕
- **快捷鍵**: 
  - `Ctrl+S` (Windows) 或 `Cmd+S` (Mac) - 儲存
  - `Ctrl+E` (Windows) 或 `Cmd+E` (Mac) - 切換編輯模式

### 狀態指示器
- **已儲存**: 綠色 - 所有變更已成功儲存
- **儲存中**: 粉色 - 正在儲存變更
- **載入中**: 粉色 - 正在載入資料

## 檔案結構

```
japan-itinerary/
├── server.js          # 後端伺服器和API
├── package.json       # 專案設定
├── public/
│   └── index.html     # 前端介面
├── data/              # 自動建立的資料目錄
│   └── itinerary.json # 儲存的行程資料
└── .gitignore         # Git忽略檔案設定
```

## API 端點

### GET /api/itinerary
- 取得完整的行程資料

### POST /api/itinerary
- 儲存完整的行程資料
- 請求內容: JSON格式的行程資料

### PUT /api/itinerary/item/:dayId/:itemId
- 更新特定的行程項目

### POST /api/itinerary/item/:dayId
- 新增行程項目到指定日期

### DELETE /api/itinerary/item/:dayId/:itemId
- 刪除特定的行程項目

## 資料格式

行程資料以JSON格式儲存在 `data/itinerary.json`：

```json
{
  "title": "日本關西四國行程",
  "subtitle": "2025年11月22日 - 11月29日 (8天7夜)",
  "days": [
    {
      "id": "day1",
      "date": "11/22 (六)",
      "title": "台北 → 大阪",
      "accommodation": "大阪",
      "items": [
        {
          "id": "item1",
          "type": "airport",
          "time": "07:30",
          "name": "桃園國際機場",
          "activity": "辦理登機手續、免稅店"
        }
      ]
    }
  ]
}
```

## 部署說明

### 本地部署
```bash
npm start
```

### 雲端部署
支援部署到 Heroku、Vercel、Railway 等平台：

1. 設定環境變數 `PORT`
2. 確保 `package.json` 中的 `engines` 設定正確
3. 資料會自動儲存到伺服器的檔案系統

## 安全性注意事項

⚠️ **重要**: 目前版本沒有身份驗證機制，任何人都可以編輯行程。如果需要在公開網路上使用，建議添加：

- 登入系統
- 編輯權限控制
- 資料備份機制

## 自訂設定

### 修改自動儲存間隔
在 `index.html` 中找到這行並修改時間（毫秒）：
```javascript
setTimeout(setupAutoSave, 30000); // 30秒自動儲存
```

### 變更項目類型
在 `renderTimelineItem` 函數中的 `<select>` 元素中添加新的選項。

## 故障排除

### 常見問題

**Q: 無法儲存資料**
A: 檢查伺服器是否有寫入 `data/` 目錄的權限

**Q: 頁面顯示空白**
A: 檢查瀏覽器主控台是否有JavaScript錯誤

**Q: 編輯模式無法啟動**
A: 確認瀏覽器支援 `contentEditable` 功能

### 重設資料
如果需要重設到初始狀態，刪除 `data/itinerary.json` 檔案即可。

## 技術棧

- **後端**: Node.js + Express.js
- **前端**: 原生 HTML/CSS/JavaScript
- **資料儲存**: JSON 檔案系統
- **樣式**: 自訂 CSS（響應式設計）

## 授權

MIT License - 可自由修改和分發。