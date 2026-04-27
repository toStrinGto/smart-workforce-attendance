# Progress Log

## Session: 2026-04-22 - 真实环境主流程回归修正
- 继续跑 `PLAYWRIGHT_BASE_URL=http://localhost:3000` 的真实后端主流程。
- 首轮结果：5 条主流程中 4 条通过，worker 用例失败。
- 根因 1：Playwright 默认未授权地理定位，worker 首页出现“定位失败，请允许浏览器获取当前位置后再打卡”，打卡请求未发出。
  - 修复：`e2e/main-flow.spec.ts` 新增 `permissions: ['geolocation']` 和固定 `geolocation` 坐标。
- 根因 2：真实后端数据会持久化，worker 和 foreman 账号在重复执行后不再处于“初始状态”。
  - worker 可能已经完成上班/下班打卡，按钮会变为禁用的“今日已完成”。
  - foreman 异常列表可能已经没有待处理项，只剩“待处理 (0)”和“暂无待处理异常”。
  - 修复：Playwright worker/foreman 用例改为兼容真实环境持久化状态，不再强依赖“首次执行”的按钮文案和待处理数据数量。
- 验证：
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=120000`
  - 结果：5/5 通过。
  - `npm run lint` 通过。

## Session: 2026-04-22 - 真实后端重测通过
- 用户确认后端已成功启动后，重新验证了真实联调环境：
  - `http://localhost:3000` 前端可访问。
  - `POST http://127.0.0.1:8080/api/v1/auth/login` 返回 200。
  - `GET /api/v1/foreman/site-status` 返回 200。
  - `GET /api/v1/foreman/attendance/monthly?month=2026-04` 返回 200，说明此前的 500 已修复。
- Playwright CLI 真实环境专项冒烟通过：
  - foreman 登录后可进入工作台。
  - 工头工作台只显示“提交今日施工日报”和“提醒班组签到”，旧的“审批张三的报销单 / 去审批”不再出现。
  - 点击签到提醒可进入“班组考勤”。
  - worker 登录后首页与工作台加载正常，签到提醒文案正常渲染。
  - 真实环境脚本输出：`REAL_SMOKE_OK`，`FOREMAN_BAD 0`，`WORKER_BAD 0`。

## Session: 2026-04-21 - 工头考勤日历与工作台待办收敛
- 根据浏览器批注继续修复：工头底部需要新增类似工人端的考勤日历；worker/foreman 工作台待办只保留施工日报和签到提醒。
- TDD 新增并跑红：
  - `src/pages/shared/workbenchTodos.test.ts`：签到提醒路由、worker 完成态、foreman 未签到提醒。
  - `src/pages/foreman/attendanceMonthly.test.ts`：班组月考勤数据归一化和异常列表降级数据生成。
- 实现内容：
  - 新增 `src/pages/foreman/Attendance.tsx` 和 `/foreman-attendance` 路由。
  - `src/components/MobileShell.tsx` 工头导航新增“考勤”。
  - `src/pages/shared/Workbench.tsx` 移除工头硬编码报销审批待办，新增签到提醒卡片。
  - `src/pages/shared/workbenchTodos.ts` 新增 `sign-in` 路由和签到提醒状态规则。
  - `src/lib/api.ts` 和 `public/mock/foreman-attendance-monthly.json` 补 Mock 月考勤数据。
  - `src/pages/foreman/Attendance.tsx` 在真实月考勤接口失败时降级读取 `/foreman/exceptions`。
- 后端配合发现：
  - Playwright 真实后端冒烟发现 `GET /api/v1/foreman/attendance/monthly?month=2026-04` 返回 500。
  - 已写入 `PROJECT_PLAN_AND_CHANGES.md`，完整班组考勤日历仍需后端补稳定月考勤接口。
- 验证：
  - `npx vitest run src/pages/shared/workbenchTodos.test.ts src/pages/foreman/attendanceMonthly.test.ts` 通过，11 个用例。
  - `npm run lint` 通过。
  - `npm run test` 通过，5 个测试文件 / 21 个用例。
  - Playwright CLI 专项冒烟通过：`FOREMAN_TODO_ATTENDANCE_SMOKE_OK`；前端交互通过，后端月考勤接口 500 已记录。

## Session: 2026-04-21 - 日报待办完成态修复
- 修复需求：日报待办点击进入日报页；日报填写并提交完成后，工作台按钮变灰且不可点击。
- 新增规则：`src/pages/shared/workbenchTodos.ts` 的 `hasSubmittedDailyReportToday()`，根据日报历史 `date` 判断今天是否已提交。
- 工作台接入：`src/pages/shared/Workbench.tsx` 加载时请求 `/api/v1/reports/history`，今天已有日报则按钮显示“已完成”、灰色、disabled。
- 验证：
  - `npx vitest run src/pages/shared/workbenchTodos.test.ts` 通过，4 个用例。
  - `npm run lint` 通过。
  - `npm run test` 通过，4 个测试文件 / 14 个用例。
  - Playwright 真实后端页面验证：当前账号今天已有日报，按钮显示“已完成”、灰色不可点，`badCount=0`。

## Session: 2026-04-21 - 工作台待办跳转与考勤状态规则修复
- 修复工作台待办点击行为：
  - 新增 `src/pages/shared/workbenchTodos.ts` 和测试。
  - `report` 待办点击后进入 `/daily-report`。
  - `reimburse` 待办点击后进入 `/reimbursement`。
  - `src/pages/shared/Workbench.tsx` 不再用本地 `processed` 状态假装处理完成。
- 修复工人考勤状态显示：
  - 新增 `src/pages/worker/attendanceStatus.ts` 和测试。
  - 上班时间 `>= 09:00` 显示迟到。
  - 下班时间 `< 16:00` 显示早退。
  - 缺少上班或下班时间显示缺卡。
  - `src/pages/worker/Attendance.tsx` 的日历点和详情弹窗均改用该规则。
- 验证结果：
  - 针对性 Vitest：2 个测试文件 / 7 个用例通过。
  - `npm run lint` 通过。
  - `npm run test` 通过，4 个测试文件 / 12 个用例。
  - Playwright 真实后端页面验证通过：待办进入日报页；21 号考勤点为黄色；详情显示“迟到”；`badCount=0`。

## Session: 2026-04-21 - 项目报销详情前端联调修复
- 回答用户“前端联调的问题解决了吗”：此前尚未修复到代码中，本次已直接修复。
- 修改 `src/pages/boss/ProjectReimbursementDetail.tsx`：将项目报销详情请求从无参 `/api/v1/reimbursement/project-detail` 改为携带 `projectName` 参数。
- 验证结果：
  - `npm run lint` 通过。
  - `npm run test` 通过，2 个测试文件 / 5 个用例。
  - 后端 API 复测项目报销详情返回 200。
  - Playwright 真实后端页面验证通过：页面成功渲染，`badCount=0`，不再出现项目报销详情 400。

## Session: 2026-04-21 - 真实后端 CLI 联调验证
- 使用真实后端环境测试：`.env` 为 `VITE_MOCK_ENABLED=false`，前端 `http://localhost:3000`，后端 `http://localhost:8080/api/v1`。
- `agent-browser` CLI 未安装，改用 Node `fetch` 和 Playwright CLI 完成 API 与浏览器验证。
- API 第一轮发现 3 个疑点：上传 URL 绝对路径判断过严、报销项目详情缺参数、写入用例未继续执行。
- 针对性复测确认：
  - 上传接口返回 `/uploads/...` 相对路径，不是 `blob:`；报销创建/审批和日报提交均可用该路径跑通。
  - 报销项目详情接口使用 `projectName` 参数时返回 200：`GET /reimbursement/project-detail?projectName={projectName}`。
- API 复测结果：17 项通过，0 失败。
- Playwright 真实后端主流程：旧脚本 4/5 通过；worker 用例因账号今天已完成打卡，按钮不再是“上班打卡”而超时。
- 稳健版浏览器冒烟：核心页面无 5xx；捕获到 2 次 `400 /api/v1/reimbursement/project-detail`，原因是前端页面未携带后端要求的 `projectName` 参数。

## Session: 2026-04-21 - 工人打卡与考勤页联动修复
- 根因：Mock 模式下首页 `POST /api/v1/worker/punch` 只更新 `today-status`，考勤页 `GET /api/v1/worker/attendance/monthly` 仍读取静态 JSON，导致页面间显示不一致。
- 已按 TDD 增加 `src/lib/api.test.ts` 回归测试，先确认失败，再补实现。
- 已修改 `src/lib/api.ts`：新增月考勤内存状态，打卡成功后同步当天月考勤记录，月考勤 GET 返回最新内存状态。
- 已将“真实待办事项”建议写入 `PROJECT_PLAN_AND_CHANGES.md`，包括后端接口、实体字段、前端改造和验收标准。
- 验证完成：
  - `npx vitest run src/lib/api.test.ts` 通过。
  - `npm run lint` 通过。
  - `npm run test` 通过，2 个测试文件 / 5 个用例。
  - Playwright 专项脚本通过，输出 `PLAYWRIGHT_PUNCH_MONTHLY_OK`。
  - Playwright 主流程通过，5/5。

## Session: 2026-04-21 - 前端主流程问题修复

- 按 `PROJECT_PLAN_AND_CHANGES.md` 执行前端修复。
- 已修复角色权限、URL role 覆盖、worker 打卡真实接口接入、报销/日报文件上传链路、Mock 写状态、老板考勤明细入口、工作台未完成入口和部分 aria 标签。
- 验证结果：
  - `npm run lint` 通过。
  - `npm run test` 通过（1 文件 / 4 用例）。
  - `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000` 通过（5 用例）。
- 备注：当前 `.env` 为真实后端模式，Playwright 使用单独启动的 Mock dev server `http://localhost:3001` 完成主流程验证。

### CLI 专项测试补充
- `agent-browser` CLI 未安装，改用 Playwright CLI。
- 完整主流程 Playwright 通过：5/5。
- 新功能专项脚本通过：角色权限、防 URL 切角色、上下班打卡、报销上传提交、日报上传提交。
- 复跑 `npm run lint` 通过。
- 复跑 `npm run test` 通过（1 文件 / 4 用例）。

### 浏览器评审问题修复补充
- 修复页面可见滚动条：`html/body/#root` 固定高度并隐藏文档滚动，移动端内容改为内部无滚动条滚动。
- 修复底部大留白：底部导航改为布局内占位，移动页底部 padding 从 `pb-20` 缩到 `pb-4`。
- 修复顶部用户名展示：改为用户图标 + 用户名 + 角色端标签。
- 修复报销状态展示：英文枚举统一映射为中文标签。
- UI 专项脚本通过：`UI_FIX_SMOKE_OK no_document_scrollbar username_format status_labels bottom_gap=16`。
- 主流程 Playwright 通过：5/5。

### 报销审批与用户名位置评审补充
- 报销审批按钮确认会走 `PUT /api/v1/reimbursements/{id}/approve`；真实后端模式联动后端，Mock 模式更新内存状态。
- 将“同意打款”改为“审批通过”，并增加提交中、成功、失败反馈。
- 移除移动端全局用户栏，把用户名、角色端标签、退出按钮移动到工作台账户区。
- 专项脚本通过：`COMMENT_FIX_SMOKE_OK approval_state_updated account_info_workbench_only`。
- 复跑 `npm run lint`、`npm run test`、主流程 Playwright 均通过。

## Session: 2026-04-21 - 登录起主流程中文测试文档与浏览器验证

### Phase 0: 启动
- 使用 planning-with-files 记录任务。
- agent-browser CLI 未安装；浏览器自动化将使用用户指定的 Playwright CLI/脚本完成。

### Phase 1-2: 代码阅读与文档
- 阅读了登录、鉴权、路由、移动壳、后台布局和四类角色核心页面。
- 创建 `TEST_MAIN_FLOW_CN.md`，覆盖从登录开始的 worker/foreman/boss/admin 主流程测试步骤。

### Phase 3: Playwright 验证
- 首次运行 `npx playwright test` 失败：项目未安装 `@playwright/test`。
- 尝试改为 `playwright/test` 仍无法解析模块。
- 已安装 `@playwright/test` 作为 dev dependency，继续执行页面测试。
- 首次浏览器运行失败：缺少 Playwright Chromium 二进制；已执行 `npx playwright install chromium`。
- 第二轮测试 3/5 通过，失败点为班组长异常处理选择器和老板端入口文案预期不符。
- 修正文档与测试脚本后，第三轮 Playwright 主流程测试 5/5 通过。
- 创建 `PLAYWRIGHT_MAIN_FLOW_RESULT_CN.md` 记录执行结果与已知风险。
- `npm run test` 首次失败：Vitest 会默认收集 `e2e/main-flow.spec.ts`；已在 `vitest.config.ts` 中排除 `e2e/**`。
- 最终验证：`npm run lint` 通过，`npm run test` 通过（1 文件/4 用例），Playwright 主流程通过（5 用例）。

---

## Session: 2026-04-18 — 前端接入后端 Bug 修复

### Phase 0: 探索分析
- 测试后端全部端点，确认 12 个已实现、14+ 个返回 500
- 确认 `.env` 已配置 `VITE_MOCK_ENABLED=false` + `VITE_API_BASE_URL=/api/v1`
- 确认 vite.config.ts 已添加 proxy → `http://localhost:8080`
- 分析 3 个用户报告的问题根因
- 发现额外 5+ 个有同类问题的页面

### Phase 1: 修复 number input（已完成）
- 根因：6 处 `<input type="number" value={0}>` 无法清除，因 Number("")=0 导致循环
- 修复方案：string state + parseFloat on submit
- 修改文件：Exceptions.tsx, Dashboard.tsx, Attendance.tsx
- `npm run lint` 零错误

### Phase 2: 排查所有页面（已完成）
- foreman Workbench 代码正确，请求链完整
- worker/Home.tsx 打卡完全不调 API，用 setTimeout 模拟 ← P0 问题
- shared/Reimbursement.tsx/DailyReport.tsx blob URL 图片 ← P1 问题
- boss/Contracts.tsx/IncomeSettlement.tsx 客户端生成 ID ← P2 问题

### Phase 3: 测试班组长入口（已完成）
- CLI (curl) 可以测试 API，4 个端点测试结果：
  - GET /foreman/projects ✅
  - GET /foreman/workers ✅
  - GET /foreman/exceptions ✅
  - GET /foreman/site-status ❌ 500 未实现
- 后端打卡接口确认可用：
  - POST /worker/punch?type=in&latitude=&longitude= ✅
  - GET /worker/today-status ✅
## Session: 2026-04-22 - backend todos and compact money
- Picked up the latest UI review comments:
  - workbench todos should come from backend and show an empty state when there is nothing pending
  - boss home briefing amounts should compact when values are large
- Confirmed current code still uses front-end-derived todo cards in `src/pages/shared/Workbench.tsx`.
- Confirmed boss dashboard still renders raw values in `src/pages/boss/Home.tsx`.
- Searched the codebase and did not find an existing shared compact amount formatter suitable for this screen.
- Next step: add failing tests first, then implement the todo normalization/empty state and compact amount display.
- TDD completed:
  - added `src/pages/shared/Workbench.test.tsx`
  - extended `src/pages/shared/workbenchTodos.test.ts`
  - added `src/pages/boss/formatAmount.test.ts`
- Implementation completed:
  - `src/pages/shared/Workbench.tsx` switched to backend-driven todos with empty state
  - `src/pages/shared/workbenchTodos.ts` now normalizes backend todo payloads into localized cards
  - `src/lib/api.ts` mock mode now supports `/api/v1/todos` and `/api/v1/todos/summary`
  - `src/pages/boss/Home.tsx` now compacts large amounts and formats numeric money fields cleanly
- Verification completed:
  - `npx vitest run src/pages/shared/workbenchTodos.test.ts src/pages/shared/Workbench.test.tsx src/pages/boss/formatAmount.test.ts`
  - `npm run lint`
  - `npm run test`
  - Playwright browser smoke (boss home + workbench + intercepted empty todos) output: `BOSS_TODO_AND_AMOUNT_SMOKE_OK`

## Session: 2026-04-22 - boss project cost integration fix
- Investigated the boss project cost page after user reported `项目总成本 / 人工成本 / 报销成本` all showing `0.00`.
- Confirmed real backend data exists:
  - `GET /api/v1/foreman/projects` returns the project dropdown list
  - `GET /api/v1/boss/project-cost?projectId=1` returns non-empty `attendance`, `reimbursements`, and `workers`
- Root cause: front end still expected the old mock keyed shape (`data[projectId]`), while real backend now returns a flat payload (`data.attendance`, `data.reimbursements`, `data.workers`).
- Added `src/pages/boss/projectCostData.ts` and `src/pages/boss/projectCostData.test.ts` to normalize both shapes.
- Updated `src/pages/boss/ProjectCost.tsx` to consume normalized real-backend data and merge project worker wage data safely.
- Verification completed:
  - `npx vitest run src/pages/boss/projectCostData.test.ts`
  - `npm run lint`
  - Playwright smoke for `/boss/project-cost` output: `BOSS_PROJECT_COST_SMOKE_OK`

## Session: 2026-04-22 - boss reimbursement detail compatibility fix
- Picked up the new review comments on `/boss/reimbursement-project/:projectName`:
  - clicking `本月` triggers a page crash
  - runtime error shows `allData.summary.totalAmount.replace is not a function`
  - a tiny non-zero category was rendered as `0%`
- Root cause confirmed against the real backend:
  - reimbursement summary/detail endpoints now return numeric amount fields
  - existing front-end filter transforms still assumed string amounts and called `.replace(...)`
  - detail records also return localized statuses (`已批准`, `已驳回`), which did not match the front-end status enum
- Implementation completed:
  - added `src/pages/boss/reimbursementTransforms.ts`
  - updated `src/pages/boss/ProjectReimbursementDetail.tsx` to use shared normalized display data
  - updated `src/pages/boss/ReimbursementOverview.tsx` to use the same transform logic
  - added `src/pages/boss/reimbursementTransforms.test.ts`
  - category percent labels are now recomputed from amount/total, so small non-zero values render as `0.4%` instead of `0%`
- Verification completed:
  - `npx vitest run src/pages/boss/reimbursementTransforms.test.ts`
  - `npm run lint`
  - `npm run test` -> `9 passed`, `34 passed`
  - Playwright smoke after real login -> `BOSS_REIMBURSEMENT_DETAIL_SMOKE_OK precise=true detailCrash=false overviewCrash=false`
- Debugging notes:
  - PowerShell inline scripts mangled Chinese regex/button text during early smoke attempts, so the final browser verification switched to stable button indices after a real login flow
  - direct localStorage injection initially failed because the app routed before the intended role/path state was fully established

## Session: 2026-04-22 - daily report detail modal and template delete
- Picked up the latest `/daily-report` review comments:
  - clicking a history card should open a detail modal
  - closing an unread detail modal should mark it reviewed and sync to backend
  - template management needs a delete action
- Implementation completed:
  - `src/pages/shared/DailyReport.tsx`
    - history cards are now clickable buttons
    - added a history detail modal
    - closing an unread report calls `PUT /api/v1/reports/{id}/review`
    - added template delete buttons in both the list view and edit modal
  - `src/lib/api.ts`
    - mock mode now supports `PUT /api/v1/reports/{id}/review`
    - mock mode now supports `DELETE /api/v1/reports/templates/{id}`
  - `src/pages/shared/DailyReport.test.tsx`
    - added coverage for review-on-close and template delete fallback behavior
- Verification completed:
  - `npm run lint`
  - `npx vitest run src/pages/shared/DailyReport.test.tsx`
  - real backend probe:
    - `GET /api/v1/reports/history` -> 200
    - `PUT /api/v1/reports/8/review` -> 500
    - `GET /api/v1/reports/templates` -> 200
    - `DELETE /api/v1/reports/templates/6` -> 400
  - Playwright smoke with intercepted write endpoints:
    - history card opens detail modal
    - closing modal changes first card status from `未阅` to `已阅`
    - deleting the first template reduces template card count from `6` to `5`
    - output: `smokeOk: true`

## Session: 2026-04-22 - daily report real backend retest
- Re-ran the real backend integration after backend updated the report review / template delete endpoints.
- Direct API probe result:
  - `GET /api/v1/reports/history` -> `200`
  - `PUT /api/v1/reports/10/review` -> `200`
  - `POST /api/v1/reports/templates` -> `200`
  - `DELETE /api/v1/reports/templates/{tempId}` -> `200`
- Real browser verification result on `http://localhost:3000/daily-report`:
  - used real foreman login (`13800000002`)
  - selected unread report `cli targeted report`
  - closing the detail modal triggered `PUT /api/v1/reports/8/review` -> `200`
  - card state changed from `未阅` / `老板` to `已阅` / `李班长`
  - created a temporary template `codex-real-*`
  - deleted that template from the real template management page
  - browser DELETE request `/api/v1/reports/templates/11` returned `200`
  - backend re-fetch confirmed the temporary template no longer exists
- Conclusion:
  - the two previously blocked real-backend chains are now open end-to-end
  - current real smoke evidence:
    - report review write-back works
    - template delete works

## Session: 2026-04-22 - project attendance range sync
- Picked up the latest review comments on `/project-attendance/:name`:
  - page summary and detailed records were not using the same time-range semantics
  - the worker-list modal always looked like `all` data
  - the worker-list modal needed its own selector, synced with the outer selector
- Root cause confirmed in `src/pages/boss/ProjectAttendanceDetail.tsx`:
  - project rows were filtered with `slice(...)`, so `week/month/quarter/year` meant item count instead of real date interval
  - worker modal totals came from aggregated `workers.presentDays` and `workers.overtimeHours`, which do not change per selected range
- Implementation completed:
  - added real date-interval filtering anchored to the latest attendance date in the current dataset
  - updated the summary cards and detailed records table to use the same filtered `dailyRecords`
  - added a synced inner selector beside the worker search input
  - worker modal now derives scoped counts from `GET /api/v1/boss/employee-detail?id=...`
  - person detail modal now reuses boss employee-detail records instead of the old worker-attendance shape
  - added `src/pages/boss/ProjectAttendanceDetail.test.tsx`
- Verification completed:
  - `npx vitest run src/pages/boss/ProjectAttendanceDetail.test.tsx`
  - `npm run test`
  - `npm run lint`
  - Playwright browser smoke against the live front-end with intercepted attendance endpoints:
    - month rows narrowed from `2026-04-01, 2026-04-10, 2026-04-20, 2026-04-21`
    - week rows narrowed to `2026-04-20, 2026-04-21`
    - worker-list inner selector opened with value `week`
    - switching the inner selector to `all` also updated the outer selector to `all`
    - worker count changed from `1` to `2`
    - smoke output: `smoke: true`
- Environment note:
  - local backend proxy target `localhost:8080` was unreachable during this verification window, so the browser smoke isolated the front-end behavior with Playwright route interception.

## Session: 2026-04-23 - worker missing-punch rule narrowing
- Picked up the new `/attendance` review discussion:
  - foreman-recorded days with no punch times were still rendered as red `缺卡`
  - desired business rule is narrower: only one-sided punches should count as red missing-punch anomalies
- Implementation completed:
  - `src/pages/worker/attendanceStatus.ts`
    - introduced a neutral `recorded` state
    - days with both `in/out` empty and no explicit `missing/absent` status now evaluate to `已记工 / 未打卡`
    - red `missing` now only covers explicit missing states and one-sided punch records
  - `src/pages/worker/Attendance.tsx`
    - recorded days no longer render calendar dots
    - detail modal badges use neutral gray styling for `未打卡`
  - `src/pages/worker/attendanceStatus.test.ts`
    - added regression coverage for the new recorded-vs-missing split
- Verification completed:
  - `npx vitest run src/pages/worker/attendanceStatus.test.ts`
  - `npm run test`
  - `npm run lint`
  - Playwright browser smoke on `http://localhost:3000/attendance` with intercepted monthly payload:
    - `2026-04-23` (`status=normal`, `in/out=null`) rendered with `0` red dots and `2` gray badges
    - `2026-04-24` (`in=08:05`, `out=null`) rendered with `1` red missing badge
    - smoke output: `smoke: true`

## Session: 2026-04-23 - foreman-recorded worker days promoted to normal
- Follow-up to the worker attendance review:
  - the user decided that foreman-recorded days should count as normal attendance rather than a neutral middle state
  - one-sided punches must still remain true red missing-punch anomalies
- Implementation completed:
  - `src/pages/worker/attendanceStatus.ts`
    - both `in/out` empty and not explicit `missing/absent` now evaluate to `status: normal`
    - the overall day label is now `正常`
    - detail badges remain `未打卡`, so the UI stays honest about missing punch timestamps
  - `src/pages/worker/attendanceStatus.test.ts`
    - replaced the old neutral-recorded expectation with the new normal-day expectation
- Verification completed:
  - `npx vitest run src/pages/worker/attendanceStatus.test.ts`
  - `npm run test`
  - `npm run lint`
  - Playwright browser smoke on `http://localhost:3000/attendance` with intercepted monthly payload:
    - `2026-04-23` (`status=normal`, `in/out=null`) rendered with `1` green dot and `2` `未打卡` badges
    - `2026-04-24` (`in=08:30`, `out=null`) still rendered with `1` red dot and modal `缺卡`
    - smoke output: `smoke: true`

## Session: 2026-04-23 - worker daily report templates isolated locally
- Reproduced the template-permission issue from the worker daily report page.
- Root cause confirmed from real backend + docs:
  - `GET /api/v1/reports/templates` returns a shared list without owner fields
  - worker `POST /api/v1/reports/templates` returns `403 无权限`
  - worker `PUT /api/v1/reports/templates/{id}` returns `403 无权限`
  - so the front end could neither distinguish ownership nor let workers manage their own templates through the backend
- Front-end fallback implemented for worker role:
  - worker templates now use per-user local storage keyed by worker id
  - workers no longer request the shared template list from the backend
  - workers can create, edit, and delete their own templates locally without hitting backend 403 errors
  - worker report submission now omits `templateId` so local-only template ids are not sent to the backend
- Foreman/boss behavior remains on the existing backend path.
- Verification completed:
  - `npx vitest run src/pages/shared/DailyReport.test.tsx`
  - `npm run test`
  - `npm run lint`
  - Playwright browser smoke on `http://localhost:3000/daily-report` with worker local storage seed:
    - textarea initialized from the worker's private template
    - template request count stayed `0`
    - private template visible, shared template hidden
    - deleting the worker template updated local storage to `[]`
    - smoke output: `smoke: true`

## Session: 2026-04-23 - backend spec for worker template cross-device sync
- The user requested a backend-ready spec so worker daily-report templates can sync across devices instead of staying local-only.
- Reconfirmed the backend gap before writing the spec:
  - `GET /api/v1/reports/templates` returns a shared list
  - worker `POST/PUT /api/v1/reports/templates...` still return `403`
  - template list response has no ownership fields
- Wrote a dedicated backend handoff doc:
  - `C:/files/codes/attendance-codex/Attendance/docs/backend-worker-template-sync-plan-2026-04-23.md`
- The spec includes:
  - recommended reuse of `daily_report_template`
  - `visibility` / owner-scoped template rules
  - GET/POST/PUT/DELETE template APIs
  - `POST /api/v1/reports` template ownership validation
  - migration notes and backend acceptance criteria

## Session: 2026-04-23 - backend template sync plan verification
- Re-tested the real backend after the backend team reported the worker template sync APIs were updated.
- Real API validation passed for the planned ownership model:
  - worker / foreman / boss can all create personal templates
  - worker template list includes the worker's own template with `editable=true` and `deletable=true`
  - worker cannot see the foreman's personal template
  - foreman cannot see the worker's personal template
  - system template returns `owner = null`, `editable = false`, `deletable = false`
  - worker updating own template returns `200`
  - worker deleting a system template returns `403`
  - worker submitting a report with a foreign template returns `403` and message `无权限使用该模板`
  - worker submitting a report with their own template returns `200` and the response includes `templateId` / `templateName`
  - cleanup delete for worker / foreman / boss temporary templates all returned `200`
- Key verification payload:
  - `workerCreateStatus=200`
  - `workerSeesForeman=false`
  - `workerDeleteSystemStatus=403`
  - `workerUseForeignTemplateStatus=403`
  - `workerUseOwnTemplateStatus=200`
- Important product note:
  - the backend plan is now effectively complete
  - the current frontend still keeps worker templates on local storage fallback, so end-to-end cross-device sync is not live in the UI until the frontend is cut back to the new backend API path

## Session: 2026-04-23 - worker daily-report templates cut back to backend sync
- Completed the front-end cutover from worker local template fallback to the real backend template APIs.
- `src/pages/shared/DailyReport.tsx` now:
  - loads templates from `GET /api/v1/reports/templates` for all roles
  - uses backend `editable / deletable / owner / visibility` to render template actions and scope badges
  - always submits `templateId` when a template is selected
  - refreshes the template list after create / update / delete success
  - refetches the template list after template write failures so UI state re-syncs with the server
  - clears legacy worker local storage key `daily-report-worker-templates:{userId}` after a successful worker fetch
- Removed obsolete worker-local helper file:
  - `src/pages/shared/dailyReportTemplateStorage.ts`
- Updated mock infrastructure to mirror the real backend ownership model:
  - `public/mock/daily-report-templates.json` now uses the richer template DTO
  - `src/lib/api.ts` mock template endpoints now filter to `system + self`, enforce owner-only write access, and return `templateId / templateName` on report submit
- Added/updated tests:
  - `src/pages/shared/DailyReport.test.tsx`
  - `src/lib/api.test.ts`
- Verification completed:
  - `npx vitest run src/pages/shared/DailyReport.test.tsx`
  - `npx vitest run src/lib/api.test.ts`
  - `npm run lint`
  - `npm run test`
  - local dev server started successfully at `http://localhost:3000/`

## Session: 2026-04-23 - foreman attendance persistence and reason fallback
- Completed the foreman workbench and attendance follow-up for recorded shifts.
- `src/hooks/useForeman.ts` now:
  - fetches projects first
  - loads per-project worker lists together with `GET /api/v1/foreman/attendance/today?projectId=...`
  - maps backend today-attendance into stable `submittedRecords`
  - refetches today-attendance after `POST /api/v1/foreman/attendance`
- `src/pages/foreman/Workbench.tsx` no longer keeps a page-local fake submitted state; the green "already recorded" badge now comes from backend-backed hook data.
- `src/pages/worker/attendanceStatus.ts` now returns a distinct `recorded` display status for days with no punch times but no explicit missing status; calendar dots render these days as green while detail badges remain neutral `未打卡`.
- `src/pages/foreman/attendanceMonthly.ts` now:
  - preserves explicit backend `recorded` status
  - exports `getUserFacingForemanReason(...)`
  - replaces English technical `reason` text with Chinese business fallback copy
- `src/pages/foreman/Attendance.tsx` now renders recorded days with green calendar dots and uses the Chinese reason fallback instead of showing raw backend English text.
- Mock API additions:
  - new `GET /api/v1/foreman/attendance/today?projectId=...`
  - `POST /api/v1/foreman/attendance` now updates mock today/monthly attendance state
  - mock persistence survives module reloads by storing the mock backend state in local storage keys owned by the mock API layer
  - new mock file: `public/mock/foreman-attendance-today.json`
- Added/updated tests:
  - `src/hooks/useForeman.test.tsx`
  - `src/pages/worker/attendanceStatus.test.ts`
  - `src/pages/foreman/attendanceMonthly.test.ts`
  - `src/lib/api.test.ts`
- Real environment spot-check on 2026-04-23:
  - `POST /api/v1/auth/login` returned `200`
  - `GET /api/v1/foreman/attendance/today?projectId=1` still returned `500`
  - frontend was hardened so the foreman workbench can still load workers and show an inline warning even when the today-attendance refill endpoint fails
