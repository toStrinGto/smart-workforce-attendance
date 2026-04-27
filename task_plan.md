# Task Plan: 前端接入真实后端 — Bug 修复

## Current Task: 工头考勤日历与工作台待办收敛 - `complete`

- [x] 写测试固定待办范围：worker/foreman 只保留日报与签到提醒。
- [x] 新增工头 `/foreman-attendance` 月考勤日历入口和页面。
- [x] 移除工头工作台硬编码报销审批待办。
- [x] 工人签到提醒接 `/worker/today-status`，工头签到提醒接 `/foreman/site-status`。
- [x] 月考勤接口失败时降级展示 `/foreman/exceptions` 异常日期。
- [x] 文档记录后端仍需补 `GET /api/v1/foreman/attendance/monthly?month=YYYY-MM`，当前真实后端返回 500。
- [x] `npm run lint`、`npm run test` 和 Playwright 专项冒烟完成。

## Goal
修复前端接入真实后端后的3个问题，并排查其他模块是否有同类问题。

## Phases

### Phase 1: 修复异常处理中 number input 无法编辑 — `complete`
- [x] 分析根因：`value={0}` + `onChange={Number(e.target.value)}` 导致无法清除 0
- [x] 修复 `src/pages/foreman/Exceptions.tsx` — formDayShift/formOvertime 改用 string state
- [x] 修复 `src/pages/admin/Dashboard.tsx` — handleDayShift/handleOvertimeHours 同样问题
- [x] 修复 `src/pages/admin/Attendance.tsx` — excDayShift/excOvertimeHours 同样问题
- [x] `npm run lint` 零错误

### Phase 2: 排查所有页面发送真实请求的情况 — `complete`
- [x] foreman Workbench 批量记工 — 代码正确，调用链完整（foremanApi.submitAttendance → request()）
- [x] 后端 `POST /foreman/attendance` 已实现，curl 测试通过
- [x] 发现 worker/Home.tsx 打卡功能完全不调 API（用 setTimeout 模拟）
- [x] 后端打卡接口已实现：`POST /worker/punch?type=in|out&lat=&lng=` 和 `GET /worker/today-status`

### Phase 3: 测试班组长页面入口逻辑 — `complete`
- [x] curl 测试 GET /foreman/projects ✅ 返回 2 个项目
- [x] curl 测试 GET /foreman/workers ✅ 返回 2 个工人
- [x] curl 测试 GET /foreman/exceptions ✅ 返回异常列表
- [x] curl 测试 GET /foreman/site-status ❌ 500 未实现
- [x] CLI 工具可以测试 API 逻辑，无法测试浏览器端 React 行为

### Phase 4: 修复 worker/Home.tsx 打卡功能 — `pending`
- [ ] 接入 GET /worker/today-status 显示今日打卡状态
- [ ] 接入 POST /worker/punch?type=in|out 发送打卡请求
- [ ] 从 auth store 读取真实用户信息（替代硬编码"张三"）

## Modified Files (待定)
- `src/pages/foreman/Exceptions.tsx`
- `src/pages/admin/Dashboard.tsx`
- `src/pages/admin/Attendance.tsx`

---

# Task Plan: 登录起主流程中文测试文档与浏览器验证

## Goal
阅读当前 React 代码，从登录开始梳理 worker、foreman、boss、admin 四类角色的主流程，编写中文测试文档，并用 Playwright CLI/脚本按文档执行一轮页面测试。

## Phases

### Phase 1: 代码阅读与流程梳理 - `complete`
- [x] 阅读登录、鉴权、路由、移动端壳、后台布局
- [x] 阅读四类角色主要页面入口与关键操作
- [x] 汇总 Mock 账号、URL、预期页面

### Phase 2: 编写中文测试文档 - `complete`
- [x] 创建中文测试文档
- [x] 覆盖登录、角色跳转、移动端标签、后台菜单、核心业务入口

### Phase 3: Playwright 页面测试 - `complete`
- [x] 启动本地 dev server
- [x] 使用 Playwright 打开网页
- [x] 按测试文档执行主流程验证

### Phase 4: 结果汇总 - `complete`
- [x] 记录通过/失败项
- [x] 给出问题与后续建议
# Task Plan: 2026-04-22 Workbench Todos + Boss Amount Formatting

## Current Task: backend todo integration and compact boss amounts - `complete`

- [x] Inspect current `Workbench.tsx` and `boss/Home.tsx` implementations
- [x] Verify real backend has `/api/v1/todos` and `/api/v1/todos/summary`
- [x] Add failing tests for backend todo normalization / empty state and amount formatting
- [x] Switch workbench todo section to backend-driven rendering with empty state
- [x] Add compact amount formatter for boss dashboard cards
- [x] Verify with targeted tests, lint, and browser smoke

## Notes
- Workbench is still using front-end-derived todo cards from `/reports/history`, `/worker/today-status`, and `/foreman/site-status`.
- Real backend now exposes `/api/v1/todos?status=pending`; latest observed payload includes `type`, `title`, `description`, and `actionUrl`.
- Boss dashboard can now receive numeric amounts from real backend, so raw rendering overflows visually on mobile.
- Completed implementation:
  - `Workbench.tsx` now reads `/api/v1/todos?status=pending`
  - mock API now serves `/api/v1/todos` and `/api/v1/todos/summary`
  - empty-state UI is rendered when the todo list is empty
  - boss dashboard briefing cards now compact large numeric amounts

---

# Task Plan: 2026-04-22 Boss Reimbursement Detail Compatibility

## Current Task: real-backend reimbursement transform fix - `complete`

- [x] Read `ProjectReimbursementDetail.tsx` and `ReimbursementOverview.tsx` to locate the failing filter transform.
- [x] Verify the real backend reimbursement endpoints return numeric amount fields.
- [x] Add targeted tests covering numeric amounts, tiny non-zero percentages, and localized status values.
- [x] Introduce a shared reimbursement transform layer for detail and overview pages.
- [x] Recompute tiny percent labels from numeric amounts instead of trusting integer-only backend display values.
- [x] Normalize localized status strings such as `已批准` / `已驳回` into front-end enum values.
- [x] Verify with `npm run lint`, `npm run test`, and a Playwright smoke flow after real login.

## Notes
- Root cause was front-end-only: the pages still assumed string amounts and called `.replace(...)` after the real backend switched to numeric money fields.
- A second display issue came from trusting backend integer `percent` values for tiny categories, which made non-zero data render as `0%`.
- `src/pages/boss/reimbursementTransforms.ts` now centralizes amount normalization, time-filter scaling, percent-label generation, and status normalization for boss reimbursement screens.

---

# Task Plan: 2026-04-22 Daily Report Detail Modal + Template Delete

## Current Task: history detail / review write-back / template delete - `complete`

- [x] Inspect `src/pages/shared/DailyReport.tsx` and current backend capability.
- [x] Add regression tests for history detail close-to-review and template delete.
- [x] Implement clickable history cards, detail modal, reviewed write-back, and template delete UI.
- [x] Extend mock API with `PUT /api/v1/reports/{id}/review` and `DELETE /api/v1/reports/templates/{id}`.
- [x] Verify with `npm run lint`, targeted Vitest, backend probe, and Playwright smoke.

## Notes
- Frontend now opens a detail modal when a history card is clicked.
- Closing an unread report attempts `PUT /api/v1/reports/{id}/review`; success updates local history state from `未阅` to `已阅`.
- Template cards and the template edit modal now both expose delete actions.
- Real backend is still not fully aligned:
  - `PUT /api/v1/reports/{id}/review` currently returns `500`.
  - `DELETE /api/v1/reports/templates/{id}` currently returns `400`.
- Frontend behavior is intentionally honest: if the real backend write fails, the modal stays open and shows an error instead of faking success.

---

# Task Plan: 2026-04-22 Project Attendance Range Sync

## Current Task: project attendance detail range filtering and worker-list sync - `complete`

- [x] Reproduce the mismatch where summary cards react to the time range but detailed rows still show unrelated dates.
- [x] Replace count-based `slice(...)` logic with real date-interval filtering on `dailyRecords`.
- [x] Keep the worker list modal in sync with the outer selector and add an inner range selector beside the search field.
- [x] Derive worker counts from `GET /api/v1/boss/employee-detail?id=...` so the modal no longer shows full-project totals under week/month filters.
- [x] Verify with targeted tests, full Vitest, TypeScript lint, and browser smoke.

## Notes
- Root cause was front-end only:
  - `src/pages/boss/ProjectAttendanceDetail.tsx` filtered by item count, not by real `date`.
  - the worker modal read aggregated `workers.presentDays / overtimeHours`, so it always behaved like `全部`.
- Range calculations now anchor to the latest attendance date in the current dataset, which keeps the filter stable for snapshot data.
- Browser smoke was completed against the live front-end with Playwright route interception because `localhost:8080` was unreachable during this verification window.

---

# Task Plan: 2026-04-23 Worker Missing Punch Rule Narrowing

## Current Task: only one-sided punches should render as red missing dots - `complete`

- [x] Inspect the worker attendance calendar and shared attendance evaluation logic.
- [x] Narrow the missing rule so only one-sided punch records show red `缺卡`.
- [x] Keep foreman-recorded days with both punch times empty out of the red-dot path.
- [x] Update worker calendar badges and detail modal styling for the new neutral `已记工 / 未打卡` state.
- [x] Verify with targeted tests, full Vitest, TypeScript lint, and browser smoke.

## Notes
- Root cause was in `src/pages/worker/attendanceStatus.ts`: any `in === null` or `out === null` immediately became `missing`, which lumped together:
  - only punched in
  - only punched out
  - foreman-recorded days with no punch times at all
- The new rule is:
  - exactly one side missing -> red `缺卡`
  - both sides missing but not explicitly `missing/absent` -> neutral `已记工`

---

# Task Plan: 2026-04-23 Foreman Recorded Days Count As Normal

## Current Task: worker attendance should treat foreman-recorded days as normal - `complete`

- [x] Recheck the shared worker attendance evaluation rules and the regression tests.
- [x] Change the rule so records with both `in/out` empty and no explicit `missing/absent` status evaluate to calendar `normal`.
- [x] Keep the detail modal honest by continuing to show `未打卡` badges instead of fabricating punch times.
- [x] Verify that one-sided punches still stay on the red `缺卡` path.
- [x] Run targeted tests, full Vitest, TypeScript lint, and browser smoke.

## Notes
- This task supersedes the earlier neutral `recorded` decision for worker attendance.
- Final rule after this change:
  - both `in/out` empty + not explicit missing -> green normal day
  - modal badges still show `未打卡`
  - only explicit missing states or one-sided punches show red `缺卡`

---

# Task Plan: 2026-04-23 Worker Template Ownership Fallback

## Current Task: isolate worker daily-report templates and avoid backend 403s - `complete`

- [x] Reproduce the worker template permission failure against the real backend.
- [x] Confirm whether the template list includes any ownership field the frontend can use.
- [x] Add regression coverage for worker-private template visibility and local delete behavior.
- [x] Implement a worker-only private-template fallback that keeps templates per user on the current device.
- [x] Keep foreman/boss on the existing backend template flow.
- [x] Run targeted tests, full Vitest, TypeScript lint, and browser smoke.

## Notes
- Real backend currently follows the older permission spec:
  - worker can read template list
  - worker cannot create, edit, or delete templates
- Because the template list also lacks owner metadata, pure frontend filtering was impossible.
- Final frontend behavior after this change:
  - worker templates are private per-user on the current device
  - worker create/edit/delete no longer hit backend 403 responses
  - foreman/boss remain on backend templates until ownership-aware server APIs are available

---

# Task Plan: 2026-04-23 Worker Template Cross-Device Backend Spec

## Current Task: write backend API spec for cross-device template sync - `complete`

- [x] Confirm current backend worker template permissions and response shape.
- [x] Write a backend-facing spec for private template ownership and cross-device sync.
- [x] Include concrete endpoints, params, response fields, permission rules, and acceptance criteria.
- [x] Link the new spec back into the project planning files.

## Notes
- Spec file written to:
  - `C:/files/codes/attendance-codex/Attendance/docs/backend-worker-template-sync-plan-2026-04-23.md`
- Recommended backend direction:
  - keep system templates public read-only
  - make user-created templates personal and owner-scoped
  - allow worker/foreman/boss to CRUD only their own personal templates

---

# Task Plan: 2026-04-23 Worker Daily Report Templates Backend Cutover

## Current Task: remove worker local fallback and switch to backend sync - `complete`

- [x] Replace worker local template reads with `GET /api/v1/reports/templates`
- [x] Remove worker-only local create / edit / delete branches
- [x] Render template actions from backend `editable / deletable`
- [x] Add `系统模板` / `我的模板` scope badges in template management
- [x] Always include `templateId` when submitting a report with a selected template
- [x] Clear legacy `daily-report-worker-templates:{userId}` local storage after a successful worker template fetch
- [x] Update mock template/report endpoints to enforce `system + self` visibility and owner-only writes
- [x] Remove `src/pages/shared/dailyReportTemplateStorage.ts`
- [x] Add regression coverage for UI cutover and mock API ownership logic
- [x] Verify with targeted Vitest, full `npm run test`, full `npm run lint`, and local dev server startup

---

# Task Plan: 2026-04-23 Foreman Attendance Persistence and Copy Cleanup

## Current Task: make foreman recorded state survive refresh and stop leaking English reason text - `complete`

- [x] Add failing tests for foreman today-attendance refetch, recorded display semantics, and Chinese reason fallback.
- [x] Extend foreman service/hook flow to read `GET /api/v1/foreman/attendance/today?projectId=...`.
- [x] Remove page-local fake submitted state from `src/pages/foreman/Workbench.tsx` and render backend-backed submitted records instead.
- [x] Keep `recorded` explicit in attendance evaluation and render it as green-on-calendar plus neutral `未打卡` in details.
- [x] Add user-facing Chinese fallback copy for missing/recorded foreman reasons and suppress raw English technical messages.
- [x] Extend mock API persistence for `GET /api/v1/foreman/attendance/today` and `POST /api/v1/foreman/attendance`.
- [x] Verify with targeted Vitest, full `npm run test`, and full `npm run lint`.
