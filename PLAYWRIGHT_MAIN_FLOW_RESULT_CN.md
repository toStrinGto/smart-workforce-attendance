# Playwright 主流程测试结果

## 测试时间

2026-04-21

## 测试环境

- 本地地址：`http://localhost:3000`
- 启动模式：`VITE_MOCK_ENABLED=true`
- 浏览器：Playwright Chromium
- 执行命令：

```powershell
npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000
```

## 执行结果

| 用例 | 结果 |
| --- | --- |
| AUTH：未登录拦截和登录表单校验 | 通过 |
| WORKER：登录、打卡、考勤、统计、工作台入口 | 通过 |
| FOREMAN：登录、批量记工、异常处理、工作台入口 | 通过 |
| BOSS：登录、企业看板、考勤、报销审批、工作台入口 | 通过 |
| ADMIN：登录、后台菜单、项目/员工/考勤/设置主流程 | 通过 |

最终结果：`5 passed (15.8s)`。

## 测试产物

关键页面截图保存在：

- `test-results/main-flow/auth-login-validation.png`
- `test-results/main-flow/worker-punch.png`
- `test-results/main-flow/worker-reimbursement.png`
- `test-results/main-flow/foreman-workbench.png`
- `test-results/main-flow/foreman-daily-report.png`
- `test-results/main-flow/boss-home.png`
- `test-results/main-flow/boss-reimbursement.png`
- `test-results/main-flow/admin-settings.png`

## 测试中发现并处理的事项

- 当前项目未安装 `@playwright/test`，已补充为 dev dependency。
- Playwright 浏览器二进制缺失，已执行 `npx playwright install chromium` 安装。
- 老板端“人员考勤明细”入口实际不是文字入口，而是“今日总出勤 (人)”统计卡片，测试文档已修正。
- 班组长异常页同时存在“待处理”标签和“处理”按钮，Playwright 选择器需要 `exact: true`，自动化脚本已修正。
- Vitest 会默认收集 `*.spec.ts`，已在 `vitest.config.ts` 中排除 `e2e/**`，避免 Playwright 用例被单元测试误加载。

## 基础检查

- `npm run lint`：通过。
- `npm run test`：通过，1 个测试文件、4 个用例。
- `npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000`：通过，5 个用例。

## 已知风险

- 当前 `.env` 为 `VITE_MOCK_ENABLED=false`，本次测试使用启动命令临时覆盖为 Mock 模式。
- Mock 模式下非 GET 请求统一返回成功，因此表单提交只验证前端交互链路，不验证真实后端落库。
- 工人打卡仍是前端模拟流程，不代表真实打卡接口已接入。
