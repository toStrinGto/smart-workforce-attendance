# 开发日记 — 完善移动端页面功能

## 阶段一：基础设施（类型 + Mock 数据 + API 路由）

- [x] **T1** ✅ 2026-04-16 — 扩展 Exception status 类型 (`'pending' | 'handled' | 'rejected'`) + 新增 `ProcessExceptionPayload`、`RejectExceptionPayload` 接口 → `src/types/models.ts`
- [x] **T2** ✅ 2026-04-16 — 创建 `public/mock/worker-attendance-monthly.json`（22条4月工作日考勤记录）
- [x] **T3** ✅ 2026-04-16 — 创建 `public/mock/worker-stats.json`（统计数据含收入）
- [x] **T4** ✅ 2026-04-16 — 创建 `public/mock/boss-employees.json`（8名员工考勤列表）
- [x] **T5** ✅ 2026-04-16 — 创建 `public/mock/boss-employee-detail.json`（44条员工日考勤记录 + 汇总）
- [x] **T6** ✅ 2026-04-16 — 创建 `public/mock/boss-project-attendance-detail.json`（44条日汇总 + 7名工人 + 统计）
- [x] **T7** ✅ 2026-04-16 — 创建 `public/mock/boss-project-cost.json`（3个项目成本数据：出勤/报销/工人工资）
- [x] **T8** ✅ 2026-04-16 — 在 `src/lib/api.ts` 注册 6 个新 mock 路由（放在 `/api/v1/projects` 通配之前）

## 阶段二：Foreman 服务层更新

- [x] **T9** ✅ 2026-04-17 — 更新 `src/services/foreman.ts`：`processException` 增加 `payload: ProcessExceptionPayload` 参数，新增 `rejectException(id, payload)` 方法
- [x] **T10** ✅ 2026-04-17 — 更新 `src/hooks/useForeman.ts`：`processException` 传递 payload，新增 `rejectException` 方法（乐观更新状态为 `'rejected'`）

## 阶段三：Boss 页面修改

- [x] **T11** ✅ 2026-04-17 — `src/pages/boss/Home.tsx`：恢复 collectionAmount、invoiceAmount、invoicedUncollected、paidUninvoiced 4 个金额字段，移除 `¥ -` 占位符
- [x] **T12** ✅ 2026-04-17 — `src/pages/boss/EmployeeAttendance.tsx`：删除 `MOCK_EMPLOYEES` 硬编码数组，改用 `request('/api/v1/boss/employees')` + loading skeleton
- [x] **T13** ✅ 2026-04-17 — `src/pages/boss/EmployeeDetail.tsx`：删除 500 条随机记录生成 + `setTimeout(600)`，改用 `request('/api/v1/boss/employee-detail')` 获取固定数据
- [x] **T14** ✅ 2026-04-17 — `src/pages/boss/ProjectAttendanceDetail.tsx`：删除 500 条随机记录生成 + 2 处 `setTimeout`，改用 `request('/api/v1/boss/project-attendance-detail')`；person detail 也去除日期篡改逻辑
- [x] **T15** ✅ 2026-04-17 — `src/pages/boss/ProjectCost.tsx`：删除所有 `Math.random()` 出勤/报销/工资数据，改用 `request('/api/v1/boss/project-cost')` 获取按项目分组的真实 mock 数据

## 阶段四：Worker 页面修改

- [x] **T16** ✅ 2026-04-17 — `src/pages/worker/Attendance.tsx`：删除 `mockAttendance` 硬编码对象和假 `setTimeout`，改用 `request('/api/v1/worker/attendance/monthly')` 按月加载数据；类型扩展支持 `overtime` 状态
- [x] **T17** ✅ 2026-04-17 — `src/pages/worker/Stats.tsx`：完整重写，删除硬编码 `stats` 对象，改用 `request('/api/v1/worker/stats')` 加载；新增"累计收入"卡片显示 `totalEarnings`（`Wallet` 图标 + 绿色样式）；月份切换重新加载
- [x] **T18** ✅ 2026-04-17 — `src/pages/shared/Workbench.tsx`：排班/设置等未实现模块按钮点击时显示 framer-motion toast "功能开发中"（2秒后自动消失）

## 阶段五：Foreman 页面修改

- [x] **T19** ✅ 2026-04-17 — `src/pages/foreman/Exceptions.tsx`：完整重写
  - 表单输入改为受控组件（`formDayShift`/`formOvertime`/`formNotes`），`handleProcess` 传递 payload 到 API
  - 新增"已驳回"标签页（`TabType = 'pending' | 'handled' | 'rejected'`），显示红色驳回状态
  - 新增驳回区域：驳回原因输入框 + 驳回按钮（需填写原因才可点击），调用 `rejectException(id, { reason })`
  - 打开弹窗时重置表单状态，`stopPropagation` 防止点击穿透

## 阶段六：验证

- [x] **T20** ✅ 2026-04-17 — `npm run lint`（tsc --noEmit）通过，零类型错误
- [x] **T21** ✅ 2026-04-17 — 逐页验证结果：
  - 6 个新 Mock JSON 文件结构正确：`worker-attendance-monthly`(22条)、`worker-stats`(4字段)、`boss-employees`(8条)、`boss-employee-detail`(44条records+summary)、`boss-project-attendance-detail`(44条dailyRecords+7workers)、`boss-project-cost`(3项目)
  - `boss-home.json` 4 个金额字段均有值（collectionAmount=32.1M, invoiceAmount=35.0M, invoicedUncollected=2.9M, paidUninvoiced=1.5M）
  - API 路由注册顺序正确，6 个新路由均在 `/api/v1/projects` 通配之前
  - 全部改动文件无 `Math.random`、假 `setTimeout`、硬编码 `MOCK_*` 残留
  - Dev server 正常启动，HTTP 200

## 阶段七：API 文档生成

- [x] **T22** ✅ 2026-04-17 — 创建 `API.md`（1277 行），整理全部 32 个 API 端点，按 7 个模块分组（Worker、Foreman、Boss-考勤、Boss-合同、Boss-报销、Admin、共享日报），每个端点包含 HTTP 方法、URL、请求参数/请求体字段类型说明、响应数据结构与示例值，末尾附 Mock 路由映射表

## 阶段八：登录系统 + JWT 认证

> 目标：新增手机号+密码登录页，Access+Refresh Token 双 token 认证，角色由后端返回，为 Spring Boot 后端对接做准备。

### 前端任务

- [x] **T23** ✅ 2026-04-17 — 创建 `src/types/auth.ts`：定义 `User`、`LoginRequest`、`LoginResponse`、`RefreshResponse` 类型
- [x] **T24** ✅ 2026-04-17 — 创建 `src/store/useAuthStore.ts`：auth 专用 Zustand store（accessToken、refreshToken、user、isAuthenticated），persist 到 localStorage（key: `auth-storage`）
- [x] **T25** ✅ 2026-04-17 — 创建 `src/services/auth.ts`：封装 `authApi.login()` 和 `authApi.refresh()` 两个 API 调用
- [x] **T26** ✅ 2026-04-17 — 修改 `src/lib/api.ts`：
  - A) Authorization header 从 useAuthStore 读取 token
  - B) 实现 401 拦截器（isRefreshing + failedQueue 防并发刷新，刷新失败自动 logout + 跳转 /login）
  - C) Mock 模式新增 auth 路由（4 个测试账号：13800000001~04 对应 worker/foreman/boss/admin，密码 123456）
- [x] **T27** ✅ 2026-04-17 — 创建 `src/components/AuthGuard.tsx`：未登录重定向到 /login（携带来源路径）
- [x] **T28** ✅ 2026-04-17 — 创建 `src/components/GuestGuard.tsx`：已登录按角色重定向到首页
- [x] **T29** ✅ 2026-04-17 — 创建 `src/pages/login/Login.tsx`：手机号+密码登录表单（渐变头部、输入校验、loading 状态、错误提示、Mock 模式测试账号提示）
- [x] **T30** ✅ 2026-04-17 — 修改 `src/App.tsx`：新增 /login 路由、所有路由包裹 AuthGuard/GuestGuard、RoleSync 增加从 authStore 读取 role 的优先级
- [x] **T31** ✅ 2026-04-17 — 修改 `src/components/WebAdminLayout.tsx`：退出登录按钮绑定 handler、头像/姓名改为读取 authStore
- [x] **T32** ✅ 2026-04-17 — 修改 `src/components/MobileShell.tsx`：添加顶部用户栏（用户名 + 退出图标），仅移动端显示

### 验证任务

- [x] **T33** ✅ 2026-04-17 — `npm run lint`（tsc --noEmit）通过，零类型错误
- [x] **T34** ✅ 2026-04-17 — 功能验证：
  - 全部新文件结构完整：`types/auth.ts`、`store/useAuthStore.ts`、`services/auth.ts`、`AuthGuard.tsx`、`GuestGuard.tsx`、`pages/login/Login.tsx`
  - `api.ts` 中 Mock auth 路由已注册（login + refresh），4 个测试账号对应 4 角色
  - `WebAdminLayout` 退出按钮 + 动态用户名/头像
  - `MobileShell` 顶部用户栏 + 退出按钮（仅 md:hidden 移动端）
  - `App.tsx` 路由：/login 包裹 GuestGuard，其余路由包裹 AuthGuard
  - Dev server 启动正常，/login 页面 HTTP 200

### 后端注意事项（Spring Boot + Spring Security）

1. 必须实现 `POST /api/v1/auth/login` 和 `POST /api/v1/auth/refresh`
2. Access Token：JWT，15-30 分钟有效期，含 sub(userId)、role、phone
3. Refresh Token：每次轮换（旧失效），7 天有效期，存数据库支持撤销
4. 密码用 BCrypt 加密（cost factor ≥ 12）
5. 所有接口统一返回 `{ code: 200, message, data }` 格式
6. 登录限频：每手机号 15 分钟内最多 5 次尝试
7. 错误提示统一"手机号或密码错误"（不区分手机号错还是密码错）
8. 用户表：`users(id, phone[unique], password_hash, name, role[enum], avatar_url, created_at, updated_at)`
9. Refresh Token 表：`refresh_tokens(id, user_id, token_hash, expires_at, revoked, created_at)`
10. CORS：生产限制前端域名，开发允许 localhost:3000

### Bug 修复记录

#### BUG-1：Zustand persist 水合竞态导致页面刷新闪跳登录页（严重）

- **发现日期**: 2026-04-17
- **现象**: 页面刷新后短暂闪跳到 `/login` 页面，然后又跳回正常页面
- **根因**: `useAuthStore` 使用 `persist` 中间件，localStorage 异步读取。首次渲染时 `isAuthenticated = false`（默认值），AuthGuard 在水合完成前就执行重定向到 `/login`。水合完成后 `isAuthenticated` 变为 `true`，GuestGuard 又重定向回首页，造成闪跳
- **影响范围**: 所有受 AuthGuard/GuestGuard 保护的页面
- **修复文件**:
  - `src/store/useAuthStore.ts` — 添加 `_hasHydrated: boolean` 标志 + `setHasHydrated()` 方法；persist 配置添加 `onRehydrateStorage` 回调在水合完成后设置 `_hasHydrated = true`
  - `src/components/AuthGuard.tsx` — 读取 `_hasHydrated`，未水合时显示 Loader2 spinner 而非重定向
  - `src/components/GuestGuard.tsx` — 同上，未水合时显示 loading spinner
- **修复原则**: 守卫组件在水合完成前不执行任何路由跳转，只显示 loading 状态

#### BUG-2：MobileShell 用户栏与页面头部间距叠加过大（中等）

- **发现日期**: 2026-04-17
- **现象**: 移动端页面顶部出现过大空白区域（约 120px）
- **根因**: MobileShell 新增用户栏使用 `pt-10`（40px）模拟状态栏间距，但各页面头部自身也有 `pt-12`（48px）用于状态栏间距，两者叠加导致顶部空间过大
- **影响范围**: 所有移动端页面（worker/foreman/boss）
- **修复文件**: `src/components/MobileShell.tsx` — 用户栏 `pt-10` 改为 `pt-2`，因为用户栏作为最顶层元素不再需要为状态栏预留空间

## 阶段九：登录页响应式适配（PC 端管理登录）

> 目标：管理员使用 PC 端后台，需要在桌面端显示专业的左右分栏登录布局，而非移动端风格。采用方案 A（同一 `/login` 路由，Tailwind 响应式切换）。

- [x] **T35** ✅ 2026-04-17 — 修改 `src/pages/login/Login.tsx` 实现响应式登录页
  - 移动端（< md）：保持原有布局 — 橙色渐变头部（HardHat 图标 + 标题）+ 白色表单卡片上移重叠，通过 `md:hidden` 仅在移动端显示
  - 桌面端（md+）：左右分栏布局（`md:w-1/2` 各占一半）
    - 左侧：橙色渐变背景（`from-orange-500 to-orange-600`）+ 半透明装饰圆形 + 品牌介绍（Logo、标语、3 个功能亮点），通过 `hidden md:flex` 仅在桌面端显示
    - 右侧：表单卡片垂直水平居中（`md:flex md:items-center md:justify-center md:flex-1`），加大 padding（`md:p-8`）和阴影（`md:shadow-lg`）
  - 表单逻辑、校验规则、Mock 测试账号提示、framer-motion 动画保持不变
  - `npm run lint` 零类型错误通过
