# LOF Monitor

LOF 基金套利监控系统 - 实时追踪 LOF 基金溢价率，发现套利机会。

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 实时显示 390+ 只 LOF 基金溢价率
- 自定义监控规则（溢价/折价阈值告警）
- Webhook 通知（企业微信、钉钉、飞书）
- 深色/浅色主题切换
- 一键导出 CSV 数据
- Docker 一键部署

## Quick Start

### 方式一：Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/slicenferqin/lof-monitor-frontend.git
cd lof-monitor-frontend

# 一键启动
docker compose up -d

# 访问
# 前端: http://localhost:3000
# API:  http://localhost:8000/docs
```

### 方式二：本地开发

**1. 启动后端**

```bash
cd backend
pip install -r requirements.txt
python api_server.py
```

**2. 启动前端**

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`

## Project Structure

```
lof-monitor-frontend/
├── src/                  # Next.js 前端
│   ├── app/              # 页面路由
│   ├── components/       # React 组件
│   └── lib/              # 工具函数
├── backend/              # Python 后端
│   ├── api_server.py     # FastAPI 服务
│   ├── app.py            # 数据获取逻辑
│   ├── monitor_engine.py # 监控引擎
│   └── webhook_sender.py # 通知发送
├── docker-compose.yml    # Docker 编排
└── Dockerfile            # 前端镜像
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lof-data` | 获取所有 LOF 基金数据 |
| GET | `/api/rules` | 获取监控规则列表 |
| POST | `/api/rules` | 创建监控规则 |
| DELETE | `/api/rules/{id}` | 删除监控规则 |
| POST | `/api/rules/{id}/toggle` | 启用/禁用规则 |

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Radix UI

**Backend**
- Python 3.11
- FastAPI
- Akshare (数据源)
- Pandas

## Configuration

创建 `.env.local` 配置环境变量：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## License

MIT
