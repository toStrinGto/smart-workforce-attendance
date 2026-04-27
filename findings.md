# Findings: 前端接入后端问题分析

## 2026-04-21 登录起主流程阅读发现
- 登录页使用 Mock 账号：工人 `13800000001`、班长 `13800000002`、老板 `13800000003`、管理员 `13800000004`，统一密码 `123456`。
- `AuthGuard` 包裹 `/admin/*` 和移动端路由；未登录访问业务页会跳到 `/login`。
- 登录成功后根据 `user.role` 跳转：worker/foreman/boss 到 `/`，admin 到 `/admin`。
- 移动端底部导航按角色变化：worker 为打卡/考勤/统计/工作台，foreman 为记工/异常处理/工作台，boss 为首页/考勤/报销/工作台。
- `agent-browser` CLI 当前不可用；将用 Playwright CLI/脚本完成浏览器验证。
- 实测发现老板端项目考勤页没有“人员考勤明细”文案入口，实际应点击“今日总出勤 (人)”统计卡片进入 `/employee-attendance`。
- 实测发现班组长异常页有“待处理”标签和“处理”行按钮，Playwright role name 默认会做子串匹配，自动化选择器需要 `exact: true` 精确匹配按钮名 `处理`，避免点到标签。

---

## 问题 1: number input 无法清除 0 编辑

### 根因
React 受控 `<input type="number" value={0}>` 的经典问题：
- 用户删除 0 → `e.target.value = ""` → `Number("") = 0` → state 仍为 0 → 输入框回显 "0"
- 用户永远无法清空输入框来输入新值

### 受影响位置（3 个文件，6 处）
1. `src/pages/foreman/Exceptions.tsx:238` — `setFormDayShift(Number(e.target.value))`
2. `src/pages/foreman/Exceptions.tsx:248` — `setFormOvertime(Number(e.target.value))`
3. `src/pages/admin/Dashboard.tsx:271` — `setHandleDayShift(parseFloat(e.target.value) || 0)`
4. `src/pages/admin/Dashboard.tsx:275` — `setHandleOvertimeHours(parseFloat(e.target.value) || 0)`
5. `src/pages/admin/Attendance.tsx:696` — `setExcDayShift(parseFloat(e.target.value) || 0)`
6. `src/pages/admin/Attendance.tsx:700` — `setExcOvertimeHours(parseFloat(e.target.value) || 0)`

### 修复方案
改用 string state，在提交时 `parseFloat()` 转为数字。

## 问题 2: 批量记工请求分析

### foreman Workbench.tsx 代码路径
`handleSubmit()` → `submitAttendance()` (hook) → `foremanApi.submitAttendance()` → `request('/api/v1/foreman/attendance', POST)`

### curl 测试结果
- `POST /api/v1/foreman/attendance` → `{"code":200,"message":"success","data":null}` ✅

### 可能的问题
代码路径正确，请求应该能发出。需要确认：
1. 前端是否重启了 dev server（.env 变更需要重启）
2. 浏览器网络面板是否有请求记录
3. 是否有 auth token 问题

## 问题 3: 其他不会发送真实请求的页面

### P0: worker/Home.tsx
- `handlePunch()` 完全不调 `request()`，用 `setTimeout` 模拟
- 硬编码 "张三 (木工)"、"绿地中心二期"
- 打卡记录仅存于 React state，刷新即丢

### P1: shared/Reimbursement.tsx
- 提交报销时 images 发送的是 `URL.createObjectURL()` 的 blob URL
- 真实后端无法访问这些本地 blob URL
- 需要改为 FormData/multipart 上传

### P1: shared/DailyReport.tsx
- 同样 blob URL 问题
- 提交后手动构造假记录 `{id: Date.now(), boss: '王总'}` 插入 history

### P2: boss/Contracts.tsx, IncomeSettlement.tsx
- POST 时用 `Date.now()` 生成 ID，不会匹配后端返回的真实 ID
- 乐观更新无回滚

### P2: admin/Projects.tsx
- POST 发送 `id: 0`，后端会忽略或报错

## 问题 4: 后端已实现 vs 未实现端点

### 已实现（curl 测试通过）
- POST /auth/login ✅
- POST /auth/refresh ✅
- GET /worker/stats ✅
- GET /worker/attendance/monthly ✅
- GET /foreman/projects ✅
- GET /foreman/workers ✅
- POST /foreman/attendance ✅
- GET /foreman/exceptions ✅
- POST /foreman/exceptions/{id}/process ✅
- GET /dashboard/boss ✅
- GET /projects ✅
- PUT /admin/workers/{id}/wage ✅

### 未实现（500 "No static resource"）
- GET /foreman/site-status
- GET /attendance/summary
- GET /boss/employees, boss/employee-detail, boss/project-attendance-detail
- GET /boss/project-cost
- GET /workers/{id}/attendance
- GET /contracts, /income-settlements
- GET /reimbursement/overview, /project-detail
- GET /reimbursements/pending, /history
- GET /reports/templates, /history
## 2026-04-21 工人打卡后考勤页不更新
- 现象：工人在首页完成上班打卡后，进入“我的考勤”选择当天，仍看到静态旧时间。
- Mock 环境根因：`POST /api/v1/worker/punch` 更新的是 `mockWorkerTodayStatus.records`，但 `GET /api/v1/worker/attendance/monthly` 仍直接读取 `public/mock/worker-attendance-monthly.json`，两个页面不是同一数据源。
- 真实后端判断：如果线上/联调环境也出现相同现象，需要后端确认 `punch` 成功后是否持久化到月考勤接口读取的数据表/聚合视图。
- 修复方向：前端 Mock 把月考勤也改成内存状态，并在打卡成功后同步当天记录；真实后端应保证 `today-status` 和 `monthly attendance` 从同一套考勤记录派生。
## 2026-04-22 workbench todo + boss amount follow-up
- `src/pages/shared/Workbench.tsx` still derives todo cards locally:
  - daily report completion from `/api/v1/reports/history`
  - worker sign-in reminder from `/api/v1/worker/today-status`
  - foreman sign-in reminder from `/api/v1/foreman/site-status`
- User now wants workbench todos to come from backend; if backend returns no pending items, UI should show an explicit empty state.
- `src/pages/boss/Home.tsx` renders briefing values directly as `¥ {value}`. This works for mock strings like `45.2M`, but real backend can return full numeric values such as `68200000`, which overflow mobile cards.
- No shared compact-money formatter was found in `src/`; boss home is the first place that clearly needs a mixed `string | number` formatter.
- Existing mock layer in `src/lib/api.ts` does not yet provide `/api/v1/todos` or `/api/v1/todos/summary`, so mock compatibility will likely need to be added together with the UI change.
- Real backend payload confirmed on 2026-04-22:
  - worker pending todos: `daily_report`
  - foreman pending todos: `daily_report`, `attendance_reminder`
  - boss pending todos: `reimbursement_approval`
- Boss dashboard real payload still returns numeric amounts such as `68200000`, `1907500`, and `5775.33`, so compact/pretty formatting belongs in the front end instead of expecting preformatted strings.

## 2026-04-22 boss project cost root cause
- `src/pages/boss/ProjectCost.tsx` was reading `res.data[String(selectedProjectId)]`, which matches the old mock shape in `public/mock/boss-project-cost.json`.
- Real backend now returns a flat payload for `GET /api/v1/boss/project-cost?projectId=1`:
  - `data.attendance`
  - `data.reimbursements`
  - `data.workers`
- Because of that shape mismatch, the page treated real backend responses as empty and rendered all totals as `0.00`.
- The project dropdown is not hardcoded; it is currently populated from backend `GET /api/v1/foreman/projects` through `foremanApi.getProjects()`.
- Residual backend data note: project cost response for project `1` includes some attendance rows whose `workerId` values are not present in the accompanying `workers` array. The page no longer shows all-zero totals after the fix, but exact labor cost still depends on backend returning a complete worker/wage list for all attendance records.

## 2026-04-22 boss reimbursement detail real-backend compatibility
- `GET /api/v1/reimbursement/overview` and `GET /api/v1/reimbursement/project-detail?projectName=...` now return numeric money fields from the real backend, not preformatted strings.
- Front-end root cause:
  - `src/pages/boss/ProjectReimbursementDetail.tsx` and `src/pages/boss/ReimbursementOverview.tsx` were still doing `.replace(/,/g, '')` on amount fields such as `summary.totalAmount`.
  - Once the user clicked `本月 / 本季 / 本年`, the transform logic ran and hit `allData.summary.totalAmount.replace is not a function`.
- The tiny-category `0%` display was also misleading:
  - backend category payload currently includes integer `percent`
  - for very small but non-zero values like `22.33 / 5572.33`, backend sent `0`
  - UI should not display `0%` for a non-zero share when it can compute a better display value from amount and total
- Another real-backend mismatch found in the same area:
  - detail records return localized statuses such as `已批准` / `已驳回`
  - previous front-end badge logic expected `approved` / `rejected` / `pending`
- Fix direction:
  - add a shared reimbursement transform layer that accepts `number | string` amounts
  - normalize localized statuses into the front-end enum
  - recompute category percent labels from numeric amounts and total so tiny non-zero items can display values like `0.4%`

## 2026-04-22 daily report detail / review / template delete
- `src/pages/shared/DailyReport.tsx` originally had two gaps:
  - history items were plain cards without a detail view
  - template management only supported create/update, not delete
- Real backend capability re-check on 2026-04-22:
  - `GET /api/v1/reports/history` -> 200
  - `PUT /api/v1/reports/{id}/review` -> 500 with `{\"code\":500,\"message\":\"服务器内部错误\",\"data\":null}`
  - `GET /api/v1/reports/templates` -> 200
  - `DELETE /api/v1/reports/templates/{id}` -> 400 with `{\"code\":400,\"message\":\"请求参数错误\",\"data\":null}`
- Conclusion:
  - the new frontend interaction is implemented and verified
  - real end-to-end backend persistence is still blocked by missing or incompatible report review / template delete endpoints
- Frontend behavior after the fix:
  - clicking a history card opens a modal using existing history fields (`date`, `summary`, `content`, `images`, `boss/reviewer`)
  - closing an unread modal attempts to mark it reviewed; on backend failure the modal remains open and shows an error
  - template delete is available both from the template list and from the edit modal
- Browser validation strategy:
  - because the real backend write endpoints are still failing, Playwright smoke intercepted those two routes to prove the UI state transitions
  - intercepted smoke result:
    - first history item status changed from `未阅` to `已阅`
    - template count dropped from `6` to `5`
    - `smokeOk: true`

## 2026-04-22 project attendance page range mismatch
- `src/pages/boss/ProjectAttendanceDetail.tsx` was using `slice(0, daysCount)` for the detail table, so `week/month/quarter/year` meant item count instead of a real date interval.
- That created the exact mismatch reported in review:
  - summary cards reacted to the selected range
  - detailed rows could still show dates outside that range
- The worker-list modal had a second mismatch:
  - it rendered aggregated `projectData.workers[].presentDays` / `overtimeHours`
  - those numbers are full-project totals and therefore always looked like `全部`
- Existing backend support was already enough to fix the front end:
  - `GET /api/v1/boss/project-attendance-detail?name=...` provides dated `dailyRecords`
  - `GET /api/v1/boss/employee-detail?id=...` provides dated per-worker records
- Fix direction confirmed and implemented:
  - anchor range calculations to the latest attendance date in the current dataset
  - filter project rows by real interval boundaries
  - fetch/cache `boss/employee-detail` per worker for the worker modal
  - add an inner worker-list selector beside search, but bind it to the same `timeRange` state as the outer selector
- Verification note:
  - local backend proxy target `localhost:8080` was unreachable during this task window, so browser verification used Playwright route interception to isolate front-end behavior.

## 2026-04-23 worker attendance missing-dot scope
- `src/pages/worker/attendanceStatus.ts` used to classify any `in === null` or `out === null` as `missing`.
- That rule was too broad for the worker calendar because it merged together:
  - true missing-punch anomalies (only punched one side)
  - foreman-recorded days with no punch times at all
- The desired business rule for the worker calendar is narrower:
  - only one-sided punches should show red `缺卡`
  - foreman-recorded days with no punch times should not show red dots
- Implemented split:
  - explicit `missing/absent` still stays in the red path
  - both sides empty without explicit missing status now evaluate to neutral `recorded`
  - worker detail modal styles that state with gray `未打卡` badges instead of red missing badges

## 2026-04-23 worker attendance foreman-recorded days now count as normal
- The previous front-end split introduced a neutral `recorded` path for days where both `in/out` were empty without explicit missing status.
- After product clarification, that was still too conservative for the worker calendar.
- Final business rule confirmed in this pass:
  - both `in/out` empty + no explicit `missing/absent` -> treat the day as normal in the calendar
  - keep the detail modal badges as `未打卡` so the UI does not invent punch times
  - only explicit missing states and one-sided punches remain red `缺卡`
- This is still a front-end decision layer on top of backend monthly attendance data; the backend is not currently sending a separate `recorded-normal` status.

## 2026-04-23 worker daily-report template permission mismatch
- Real backend behavior and current frontend expectation were misaligned:
  - backend docs explicitly allow `GET /api/v1/reports/templates` for worker but restrict `POST/PUT` to foreman and boss
  - real backend responses confirm worker write attempts return `403 无权限`
  - template list response currently has no owner field, so the frontend cannot distinguish self-owned templates from other users' templates
- Product expectation from review is different:
  - each worker should manage only their own templates
  - templates should not be visible across workers
- Front-end workaround implemented in this pass:
  - worker role now uses per-user local template storage instead of the shared backend template list
  - this removes cross-worker visibility on the current device and avoids backend 403s for create/edit/delete
- Remaining backend gap:
  - true cross-device persistence and true server-side ownership still require backend support for owner-scoped template APIs or owner fields on template records

## 2026-04-23 backend handoff for worker template cross-device sync
- The existing backend schema docs already mention `daily_report_template.creator_id`, so ownership-aware templates can likely be implemented without creating a new table.
- The missing server capabilities are mainly API and visibility rules:
  - worker template CRUD
  - owner-scoped list filtering
  - ownership metadata in the template list response
  - template permission validation when submitting a report with `templateId`
- A dedicated backend spec was written here:
  - `C:/files/codes/attendance-codex/Attendance/docs/backend-worker-template-sync-plan-2026-04-23.md`
- Recommended model in that spec:
  - `system` templates remain shared read-only
  - `personal` templates are visible only to the owner and editable/deletable only by the owner

## 2026-04-23 backend verification result for worker template sync
- The backend implementation now matches the planned owner-scoped template behavior at the API layer.
- Verified with real tokens and temporary records:
  - worker / foreman / boss can create personal templates
  - template lists are filtered to `system + self`
  - worker and foreman cannot see each other's personal templates
  - system templates are explicitly non-editable and non-deletable
  - `POST /api/v1/reports` now blocks foreign `templateId` usage with `403` and allows own `templateId`
- Remaining gap is no longer backend ownership logic; it is frontend consumption:
  - `src/pages/shared/DailyReport.tsx` still routes worker templates through the local fallback (`usesWorkerPrivateTemplates`)
  - so API readiness is ahead of UI cutover

## 2026-04-23 worker template backend cutover findings
- The frontend cutover only needed one behavioral center of gravity:
  - `src/pages/shared/DailyReport.tsx`
  - the worker local fallback had concentrated all read/write branching in that file
- The high-risk regressions were not in report history; they were in template behavior:
  - worker previously skipped `GET /api/v1/reports/templates`
  - system templates always rendered editable/deletable controls because the UI ignored backend capability flags
  - worker report submit dropped `templateId`, which prevented real cross-device template linkage
- The correct front-end contract is now:
  - trust backend `visibility / owner / editable / deletable`
  - do not infer permissions from role
  - always send `templateId` when a selected template exists
- For worker legacy data, the chosen product decision was implemented literally:
  - no migration
  - no dual write
  - just remove `daily-report-worker-templates:{userId}` after the first successful server fetch
- Mock mode needed real parity work, otherwise local development would silently keep the old behavior:
  - template list had to filter to `system + self`
  - template CRUD had to enforce owner-only writes
  - report submit had to reject foreign `templateId` and echo `templateId / templateName` on success

## 2026-04-23 foreman attendance persistence findings
- The foreman workbench "recorded" badge loss was a pure frontend state-shape issue:
  - `src/pages/foreman/Workbench.tsx` stored submitted rows only in component-local `submittedRecords`
  - refresh / relogin wiped them because there was no read-back path
- The correct source of truth is the new backend read endpoint:
  - `GET /api/v1/foreman/attendance/today?projectId=...`
  - the frontend now derives displayed recorded state from that endpoint, not from the last submit response
- The English sentence in the foreman attendance detail sheet was not a runtime crash:
  - the page was rendering `selectedRecord.reason` verbatim
  - so backend or mock English diagnostics leaked straight into the user-facing UI
- `recorded` needed to stay explicit all the way through normalization and evaluation:
  - monthly normalization must preserve backend `status: 'recorded'`
  - display evaluation must keep recorded days green on the calendar but neutral inside the detail sheet
- Mock mode needed backend-like persistence to make the refresh scenario meaningful during local development:
  - module-level variables alone were not enough because a hard refresh resets them
  - storing mock foreman attendance state under mock-owned local storage keys gives refresh persistence without reintroducing page-local UI fallback
- Real backend status after frontend cutover:
  - login still works
  - `GET /api/v1/foreman/attendance/today?projectId=1` currently returns `500`
  - because of that, the new persistence flow is structurally in place but cannot fully prove itself against the live backend until that endpoint is fixed
