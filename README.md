# 2025-AI-Mark
2025-鐵人賽 AI 工具人

## Tech Stack

### 前端
- **Vue 3** - 現代化前端框架
- **TypeScript** - 型別安全的 JavaScript
- **Vite** - 快速建構工具
- **Composables** - Vue 3 組合式 API

### 後端
- **Node.js** - JavaScript 運行時環境
- **Express** - Web 應用框架
- **TypeScript** - 型別安全的 JavaScript
- **LangChain** - AI 應用開發框架
- **LangGraph** - 工作流程編排
- **OpenAI API** - AI 模型整合

## 資料夾結構

```
2025-AI-Mark/
├── frontend/                 # 前端應用
│   ├── public/              # 靜態資源
│   ├── src/
│   │   ├── components/      # Vue 組件
│   │   ├── composables/     # 組合式函數
│   │   ├── services/        # API 服務
│   │   ├── views/           # 頁面組件
│   │   ├── App.vue          # 根組件
│   │   └── main.ts          # 應用入口
│   └── index.html           # HTML 模板
├── server/                   # 後端應用
│   └── src/
│       ├── routes/          # API 路由
│       ├── scripts/         # 工具腳本
│       ├── workflows/       # AI 工作流程
│       └── index.ts         # 服務器入口
├── package.json             # 專案配置
└── vite.config.ts          # Vite 配置
```

## 開發指令


```
cp .env.example .env
```


```bash
# 同時啟動前後端開發服務器
npm run dev

# 僅啟動後端開發服務器
npm run server:dev

# 僅啟動前端開發服務器
npm run frontend:dev

# 建構前端
npm run frontend:build

# 執行 LangGraph 腳本
npm run drag-chat-graph
```

## 服務架構

- **前端服務**: http://localhost:3000
- **後端服務**: http://localhost:3001
