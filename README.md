# LOF Monitor Frontend

LOF 基金套利监控系统的前端界面，实时追踪 LOF 基金溢价率，发现套利机会。

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 实时显示 390+ 只 LOF 基金溢价率
- 自定义监控规则（溢价/折价阈值告警）
- 深色/浅色主题切换
- 一键导出 CSV 数据
- 响应式设计，支持移动端

## Quick Start

### 1. 克隆项目

```bash
git clone https://github.com/slicenfer/lof-monitor-frontend.git
cd lof-monitor-frontend
```

### 2. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 3. 启动后端 API

本项目需要配合 [LOF-Monitor](https://github.com/slicenfer/LOF-Monitor) 后端使用：

```bash
# 克隆后端项目
git clone https://github.com/slicenfer/LOF-Monitor.git
cd LOF-Monitor

# 安装 Python 依赖
pip install -r requirements.txt

# 启动 API 服务
python api_server.py
```

API 默认运行在 `http://localhost:8000`

### 4. 启动前端

```bash
npm run dev
```

访问 `http://localhost:3000` 即可使用。

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/           # 页面路由
│   ├── page.tsx   # 首页 - 基金列表
│   ├── settings/  # 设置页面
│   └── api/       # API 路由
├── components/    # React 组件
│   └── ui/        # 基础 UI 组件
└── lib/           # 工具函数
```

## Configuration

创建 `.env.local` 文件配置 API 地址（可选）：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## License

MIT
