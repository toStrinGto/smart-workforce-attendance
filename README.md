# 智工考勤 Smart Workforce Attendance

一款面向建筑工地场景的智慧考勤管理系统，基于 React 19 构建，支持四种角色（工人、班组长、老板、管理员），提供移动端与桌面端双形态界面。

## 功能概览

### 工人端（移动端）

- **GPS 打卡** — 基于地理位置的上下班打卡，支持拍照留证
- **考勤日历** — 月度考勤记录，按日展示打卡状态
- **个人统计** — 出勤率、工时等数据统计
- **工作台** — 日报填写、报销申请

### 班组长端（移动端）

- **批量记工** — 选择项目与工人，录入出勤和加班工时
- **考勤管理** — 查看班组月度考勤
- **异常处理** — 审批或驳回考勤异常申请
- **工地现场** — 今日工地状态总览

### 老板端（移动端）

- **经营首页** — 合同金额、收款、项目成本、报销汇总
- **员工考勤** — 按项目/员工查看考勤明细
- **报销管理** — 按项目查看报销详情并审批
- **合同管理** — 收入/支出合同与结算跟踪

### 管理员端（桌面端）

- **数据看板** — 项目数、工人数、异常数、工时统计及周趋势图
- **项目管理** — 项目 CRUD，状态跟踪（未开工/施工中/维保中/已完工）
- **员工管理** — 工人信息增删改查
- **考勤管理** — 全局考勤记录查看与管理
- **系统设置** — 上下班时间、宽限期、加班规则、通知配置

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 5.8 |
| 构建 | Vite 6 |
| 路由 | React Router DOM v7 |
| 状态管理 | Zustand 5（持久化到 localStorage） |
| UI 组件 | shadcn/ui（base-nova 风格）+ Lucide 图标 |
| 样式 | Tailwind CSS 4（oklch 色彩空间 + CSS 变量主题） |
| 动画 | Framer Motion |
| 单元测试 | Vitest + Testing Library |
| E2E 测试 | Playwright |
| 字体 | Geist Variable |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:3000）
npm run dev
```

项目默认以 **Mock 模式** 运行（`VITE_MOCK_ENABLED=true`），无需后端即可完整体验所有功能。

### 模拟账号

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 工人 | 13800000001 | 123456 |
| 班组长 | 13800000002 | 123456 |
| 老板 | 13800000003 | 123456 |
| 管理员 | 13800000004 | 123456 |

## 项目结构

```
src/
├── App.tsx                    # 路由配置与角色守卫
├── main.tsx                   # 入口文件
├── index.css                  # Tailwind + 主题变量
├── components/
│   ├── AuthGuard.tsx          # 认证路由守卫
│   ├── GuestGuard.tsx         # 登录页重定向守卫
│   ├── MobileShell.tsx        # 移动端底部导航布局
│   ├── WebAdminLayout.tsx     # 管理员桌面端侧边栏布局
│   └── ui/                    # shadcn/ui 通用组件
├── pages/
│   ├── login/                 # 登录页
│   ├── worker/                # 工人端页面
│   ├── foreman/               # 班组长端页面
│   ├── boss/                  # 老板端页面
│   ├── admin/                 # 管理员端页面
│   └── shared/                # 角色间共享页面（工作台、日报、报销）
├── services/
│   ├── auth.ts                # 认证 API（登录/刷新令牌）
│   ├── worker.ts              # 工人 API（打卡/今日状态）
│   └── foreman.ts             # 班组长 API（记工/异常处理等）
├── store/
│   ├── useAuthStore.ts        # 认证状态（令牌 + 用户信息）
│   └── useAppStore.ts         # 应用状态（角色）
├── hooks/                     # 自定义 Hooks
├── lib/
│   ├── api.ts                 # 核心 API 层（Mock 系统 + 真实请求 + 令牌刷新）
│   ├── logger.ts              # 统一日志工具
│   └── utils.ts               # 通用工具函数
├── types/                     # TypeScript 类型定义
└── test/                      # 测试配置
```

## 架构设计

### 认证与路由

应用使用两层 Zustand Store 管理状态：

- `useAuthStore` — 存储 `accessToken`、`refreshToken`、`user`（含 `role`），持久化到 `localStorage`（key: `auth-storage`）
- `useAppStore` — 存储 `role`，持久化到 `localStorage`（key: `app-role-storage`）

路由守卫分为：
- **GuestGuard** — 包裹 `/login`，已登录用户自动跳转到对应角色首页
- **AuthGuard** — 包裹其他所有路由，未登录跳转 `/login`，并校验 `allowedRoles`

布局按角色划分：
- **移动端**（工人/班组长/老板）— `MobileShell` 底部标签导航
- **桌面端**（管理员）— `WebAdminLayout` 侧边栏导航

### API 层

`src/lib/api.ts` 提供统一的 `request<T>()` 函数，同时支持 Mock 和真实 API：

- **Mock 模式**（`VITE_MOCK_ENABLED=true`）：完全客户端模拟后端，支持有状态的 CRUD 操作、600ms 模拟延迟、localStorage 数据持久化
- **真实模式**：通过 `fetch` 请求 `VITE_API_BASE_URL`，自动注入 Bearer Token，401 时自动刷新令牌并重试

### 角色路由分配

| 角色 | 首页 | 导航标签 |
|------|------|----------|
| 工人 | 打卡（GPS） | 打卡 / 考勤 / 统计 / 工作台 |
| 班组长 | 记工 | 记工 / 考勤 / 异常处理 / 工作台 |
| 老板 | 经营首页 | 首页 / 考勤 / 报销 / 工作台 |
| 管理员 | 数据看板 | 侧边栏：工作台 / 项目 / 员工 / 考勤 / 设置 |

## 常用命令

```bash
npm run dev      # 启动开发服务器（端口 3000）
npm run build    # 生产构建
npm run preview  # 预览生产构建
npm run lint     # TypeScript 类型检查（tsc --noEmit）
npm run test     # 运行所有单元测试
npm run clean    # 清理 dist 目录
```

运行单个测试文件：

```bash
npx vitest run src/pages/worker/attendanceStatus.test.ts
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `/api/v1` | API 基础路径（开发环境代理到 `localhost:8081`） |
| `VITE_MOCK_ENABLED` | `true` | 启用 Mock 模式，本地开发**必须设为 `true`** |
| `GEMINI_API_KEY` | — | Gemini AI API 密钥 |
| `DISABLE_HMR` | — | 设为 `true` 禁用热更新 |

