# 智工考勤 - 前端页面文件说明文档

> 本文档对项目中每个源文件的作用、核心功能进行说明，方便团队成员快速了解项目结构。

---

## 一、项目整体结构

```
src/
├── App.tsx                  # 路由总入口，定义所有页面路径和权限
├── main.tsx                 # 应用启动入口
├── index.css                # 全局样式（Tailwind + 主题色）
│
├── pages/                   # 页面组件（按角色分文件夹）
│   ├── login/               # 登录页
│   ├── worker/              # 工人端页面
│   ├── foreman/             # 班组长端页面
│   ├── boss/                # 老板端页面
│   ├── admin/               # 管理员端页面
│   └── shared/              # 多角色共享页面
│
├── components/              # 公共组件
│   ├── AuthGuard.tsx        # 路由守卫：未登录拦截
│   ├── GuestGuard.tsx       # 路由守卫：已登录拦截
│   ├── MobileShell.tsx      # 手机端底部导航栏外壳
│   ├── WebAdminLayout.tsx   # 电脑端管理员侧边栏外壳
│   ├── ErrorBoundary.tsx    # 错误边界组件
│   └── ui/                  # 基础UI组件（按钮、输入框、弹窗等）
│
├── store/                   # 状态管理（Zustand）
├── services/                # API 接口封装
├── hooks/                   # 自定义 React Hooks
├── lib/                     # 工具函数和核心 API 层
└── types/                   # TypeScript 类型定义
```

---

## 二、四大角色说明

| 角色 | 说明 | 界面形式 |
|------|------|----------|
| **worker（工人）** | 打卡、查看考勤记录和统计 | 手机端底部导航栏 |
| **foreman（班组长）** | 批量记工、考勤管理、异常处理 | 手机端底部导航栏 |
| **boss（老板）** | 经营看板、合同管理、成本分析 | 手机端底部导航栏 |
| **admin（管理员）** | 员工管理、项目管理、系统设置 | 电脑端侧边栏布局 |

---

## 三、登录页

### `src/pages/login/Login.tsx`

**作用：** 应用的登录页面，所有用户通过手机号 + 密码登录。

**核心功能：**
- 输入手机号（11位数字）和密码（至少6位）
- 登录成功后自动跳转到对应角色的首页
- 电脑端左右分栏布局，手机端上下布局
- Mock 模式下会显示测试账号提示

**调用的 API：**
- `POST /api/v1/auth/login` — 登录接口

**测试账号（Mock 模式）：**

| 手机号 | 密码 | 角色 |
|--------|------|------|
| 13800000001 | 123456 | 工人 |
| 13800000002 | 123456 | 班组长 |
| 13800000003 | 123456 | 老板 |
| 13800000004 | 123456 | 管理员 |

---

## 四、工人端页面（worker）

### 4.1 `src/pages/worker/Home.tsx` — 打卡首页

**作用：** 工人每天使用的核心页面，完成上下班打卡。

**核心功能：**
- 显示当前时间（实时时钟）
- 显示所属项目和 GPS 定位状态（是否在打卡范围内）
- 大圆形打卡按钮，点击后获取定位并提交打卡
- 上下班分两次打卡，完成后不可重复
- 下方显示今日打卡记录

**调用的 API：**
- `GET /api/v1/worker/today-status` — 获取今日打卡状态
- `POST /api/v1/worker/punch` — 提交打卡

---

### 4.2 `src/pages/worker/Attendance.tsx` — 考勤日历

**作用：** 工人查看自己每月的考勤记录。

**核心功能：**
- 月历视图，每天用不同颜色圆点标记状态（正常=绿、迟到/早退=黄、缺卡=红）
- 左右切换月份
- 点击某天弹出底部面板，显示详细的上/下班时间和打卡照片
- 点击照片可全屏查看

**调用的 API：**
- `GET /api/v1/worker/attendance/monthly?month=yyyy-MM` — 获取月度考勤数据

---

### 4.3 `src/pages/worker/Stats.tsx` — 月度统计

**作用：** 工人查看自己的月度考勤汇总数据。

**核心功能：**
- 显示当月出勤天数、加班时长
- 显示异常考勤次数和累计收入
- 左右切换月份查看不同月份

**调用的 API：**
- `GET /api/v1/worker/stats?month=yyyy-MM` — 获取月度统计

---

### 4.4 `src/pages/worker/attendanceStatus.ts` — 考勤状态判断工具

**作用：** 纯逻辑文件，不含 UI。定义了判断一条考勤记录状态的规则。

**核心逻辑：**
- 上班时间超过 9:00 → 迟到
- 下班时间早于 16:00 → 早退
- 只有上班或只有下班记录 → 缺卡
- 正常打卡 → 正常

---

## 五、班组长端页面（foreman）

### 5.1 `src/pages/foreman/Workbench.tsx` — 批量记工

**作用：** 班组长的核心工作页面，为手下工人批量记录当天出勤和加班情况。

**核心功能：**
- 顶部选择项目（弹出项目选择器）
- 显示该项目下的工人列表，可勾选需要记工的工人
- 为每个工人设置"日工数"和"加班时长"
- 底部固定操作栏，确认提交所有记工记录
- 提交成功后显示动画提示

**调用的 API：**
- `GET /api/v1/foreman/projects` — 获取项目列表
- `GET /api/v1/foreman/workers` — 获取工人列表
- `GET /api/v1/foreman/attendance/today` — 获取今日已提交记录
- `POST /api/v1/foreman/attendance` — 提交批量记工

---

### 5.2 `src/pages/foreman/Attendance.tsx` — 考勤日历

**作用：** 班组长查看整个班组每月的考勤情况。

**核心功能：**
- 月历视图，每天显示考勤状态
- 点击某天弹出底部面板，显示当天所有工人的上下班详情
- 支持查看打卡照片

**调用的 API：**
- `GET /api/v1/foreman/attendance/monthly?month=YYYY-MM` — 月度考勤
- `GET /api/v1/foreman/exceptions` — 异常记录（降级备用）

---

### 5.3 `src/pages/foreman/Site.tsx` — 今日现场

**作用：** 实时查看今天工地上谁已打卡、现场照片。

**核心功能：**
- 顶部显示总人数、已到人数、未到人数
- 下方照片墙，显示工人打卡时拍的照片
- 照片上叠加姓名和打卡时间

**调用的 API：**
- `GET /api/v1/foreman/site-status` — 获取现场状态

---

### 5.4 `src/pages/foreman/Exceptions.tsx` — 异常处理

**作用：** 班组长处理工人的考勤异常（迟到、早退、缺卡等）。

**核心功能：**
- 三个标签页：待处理 / 已处理 / 已驳回
- 待处理的异常可"通过"（补充日工数和加班时长）或"驳回"（填写驳回原因）
- 每条异常显示工人头像、姓名、日期、原因

**调用的 API：**
- `GET /api/v1/foreman/exceptions` — 获取异常列表
- `POST /api/v1/foreman/exceptions/{id}/process` — 通过异常
- `POST /api/v1/foreman/exceptions/{id}/reject` — 驳回异常

---

### 5.5 `src/pages/foreman/components/ProjectSelectorModal.tsx` — 项目选择弹窗

**作用：** 底部弹出的项目选择器，供班组长切换当前操作的项目。

**核心功能：**
- 列出所有可选项目，显示项目名、班组名、人数
- 当前选中项高亮显示
- 点击后关闭弹窗并通知父组件

---

### 5.6 `src/pages/foreman/components/WorkerListItem.tsx` — 工人列表项

**作用：** 批量记工页面中每个工人的卡片行。

**核心功能：**
- 显示头像、姓名、工种
- 可勾选/取消选择
- 选中后展开显示加班时长的加减按钮（每次0.5小时）

---

### 5.7 `src/pages/foreman/attendanceMonthly.ts` — 考勤数据标准化工具

**作用：** 纯逻辑文件。把后端返回的各种不同格式的考勤数据统一转换成前端需要的格式。

---

## 六、老板端页面（boss）

### 6.1 `src/pages/boss/Home.tsx` — 经营首页

**作用：** 老板打开 app 看到的第一个页面，展示经营概览。

**核心功能：**
- 2×2 网格显示核心财务指标：收入合同额、已结算金额、已收款金额、已开票金额
- 项目状态区：活跃项目数、已开票未收款、已收款未开票、待回款金额
- 各项目报销进度条

**调用的 API：**
- `GET /api/v1/dashboard/boss` — 获取经营看板数据

---

### 6.2 `src/pages/boss/Attendance.tsx` — 考勤总览

**作用：** 老板查看今天所有项目的出勤情况。

**核心功能：**
- 搜索栏按项目名筛选
- 顶部两张卡片：总出勤人数、总加班时长
- 下方项目列表，每张卡片显示项目名、总人数、出勤数、加班数
- 点击项目卡片跳转到项目考勤详情

**调用的 API：**
- `GET /api/v1/attendance/summary` — 获取考勤汇总

---

### 6.3 `src/pages/boss/EmployeeAttendance.tsx` — 员工考勤列表

**作用：** 老板查看每个员工今天的出勤状态。

**核心功能：**
- 搜索栏（按姓名、班组、项目搜索）
- 三个筛选标签：全部 / 在场 / 缺勤
- 员工卡片列表，显示头像、班组、项目、状态（在场/缺勤）、打卡时间、加班时长
- 点击卡片跳转到员工考勤详情

**调用的 API：**
- `GET /api/v1/boss/employees` — 获取员工列表

---

### 6.4 `src/pages/boss/EmployeeDetail.tsx` — 员工考勤详情

**作用：** 查看某个员工的历史考勤记录。

**核心功能：**
- 时间范围筛选（周/月/季/年/全部）
- 出勤天数和加班时长统计卡片
- 汇总表格：应出勤、实出勤、缺勤、加班、出勤率
- 分页明细表：每天的状态、打卡时间、加班时长

**调用的 API：**
- `GET /api/v1/boss/employee-detail?id={id}` — 获取员工考勤详情

---

### 6.5 `src/pages/boss/ProjectList.tsx` — 项目列表

**作用：** 老板查看所有项目的入口页面。

**核心功能：**
- 搜索栏（按项目名或负责人搜索）
- 状态筛选下拉框（全部/进行中/已完成等）
- 项目卡片列表，显示名称、状态、负责人
- 点击卡片跳转到项目考勤详情

**调用的 API：**
- `GET /api/v1/projects` — 获取项目列表

---

### 6.6 `src/pages/boss/ProjectAttendanceDetail.tsx` — 项目考勤详情

**作用：** 查看某个项目的详细考勤数据，是老板端最复杂的页面。

**核心功能：**
- 顶部统计卡片（累计出勤/加班）
- 每日考勤汇总表（日期、出勤/缺勤/加班人数）
- 点击某天弹出全屏面板，显示当天出勤人员列表和加班人员列表
- 支持进一步点击查看某个人的详细记录
- 支持搜索和时间范围筛选

**调用的 API：**
- `GET /api/v1/boss/project-attendance-detail?name={name}` — 项目考勤数据
- `GET /api/v1/boss/employee-detail?id={id}` — 员工考勤详情

---

### 6.7 `src/pages/boss/ProjectCost.tsx` — 项目成本

**作用：** 老板查看某个项目的人工成本和报销明细。

**核心功能：**
- 项目选择器（下拉搜索）
- 总成本卡片（人工成本 + 报销金额）
- 人工成本明细：每个工人的出勤天数、加班时长、日薪、计算出的费用
- 报销明细：每笔报销的金额和说明

**调用的 API：**
- `GET /api/v1/foreman/projects` — 项目列表
- `GET /api/v1/foreman/workers` — 工人列表
- `GET /api/v1/boss/project-cost?projectId={id}` — 项目成本数据

---

### 6.8 `src/pages/boss/Contracts.tsx` — 合同管理

**作用：** 老板管理收入和支出合同，支持完整的增删改查。

**核心功能：**
- 标签筛选：全部 / 收入 / 支出
- 搜索栏（按名称或对方单位搜索）
- 状态筛选（执行中/已完成/已终止）
- 合同卡片列表，显示名称、类型、对方、金额、日期
- 底部弹窗表单：新增/编辑合同（类型、名称、对方、金额、日期、状态、内容）
- 查看详情模式（只读展示）
- 删除确认弹窗

**调用的 API：**
- `GET /api/v1/contracts` — 获取合同列表
- `POST /api/v1/contracts` — 新增合同
- `PUT /api/v1/contracts/{id}` — 修改合同
- `DELETE /api/v1/contracts/{id}` — 删除合同

---

### 6.9 `src/pages/boss/IncomeSettlement.tsx` — 收入结算

**作用：** 管理收入结算记录（进度款、结算款、预付款、质保金等）。

**核心功能：**
- 搜索栏（按付款方或项目搜索）
- 类别筛选（进度款/结算款/预付款/质保金/其他）
- 结算卡片列表，显示付款方、类别、项目、金额、日期
- 底部弹窗表单：包含付款方、项目、日期、账期、类别、金额（含税/不含税）、税率、附件上传
- 查看详情模式（含下载附件）
- 删除确认弹窗

**调用的 API：**
- `GET /api/v1/income-settlements` — 获取结算列表
- `POST /api/v1/income-settlements` — 新增结算
- `PUT /api/v1/income-settlements/{id}` — 修改结算
- `DELETE /api/v1/income-settlements/{id}` — 删除结算

---

### 6.10 `src/pages/boss/ReimbursementOverview.tsx` — 报销总览

**作用：** 老板查看公司整体的报销情况。

**核心功能：**
- 顶部时间筛选（月/季/年/全部）
- 报销总额大字展示
- 三张统计卡片：待审批/已通过/已驳回数量
- 搜索栏按项目名筛选
- 项目卡片列表，每张显示报销总额和进度条
- 点击卡片跳转到项目报销详情

**调用的 API：**
- `GET /api/v1/reimbursement/overview` — 获取报销概览数据

---

### 6.11 `src/pages/boss/ProjectReimbursementDetail.tsx` — 项目报销详情

**作用：** 查看某个项目的报销明细。

**核心功能：**
- 顶部金额汇总卡片（总额/待审批/已通过）
- 两个标签页：概览（按类别分组展示进度条）和记录（报销单列表）
- 报销单可搜索和按状态筛选
- 点击报销单弹出底部面板显示详情（申请人、金额、状态、类别、原因、发票照片）

**调用的 API：**
- `GET /api/v1/reimbursement/project-detail?projectName={name}` — 项目报销数据

---

### 6.12 `src/pages/boss/formatAmount.ts` — 金额格式化工具

**作用：** 纯逻辑文件。把数字格式化成中文金额显示。

- `formatAmount(12345.6)` → `"12,345.6"`
- `formatCompactAmount(120000)` → `"12万"`（超过1万用"万"，超过1亿用"亿"）

---

### 6.13 `src/pages/boss/projectCostData.ts` — 项目成本数据转换工具

**作用：** 纯逻辑文件。把后端返回的项目成本数据统一转换成前端需要的格式（人工+报销分开）。

---

### 6.14 `src/pages/boss/reimbursementTransforms.ts` — 报销数据转换工具

**作用：** 纯逻辑文件。把后端返回的报销数据按时间范围（月/季/年）进行缩放计算和格式化。

---

## 七、管理员端页面（admin）

> 管理员端使用电脑端侧边栏布局，适合在 PC 上操作。

### 7.1 `src/pages/admin/Dashboard.tsx` — 管理后台首页

**作用：** 管理员登录后看到的仪表盘，展示全局数据概览。

**核心功能：**
- 四张统计卡片：活跃项目数、在场工人数、考勤异常数、本月工时
- 7天出勤趋势柱状图
- 活跃项目列表（含进度条）
- 待处理异常列表（可直接通过/驳回）

**调用的 API：**
- `GET /api/v1/projects` — 项目列表
- `GET /api/v1/foreman/workers` — 工人列表
- `GET /api/v1/foreman/exceptions` — 异常列表
- `GET /api/v1/attendance/summary` — 考勤汇总

---

### 7.2 `src/pages/admin/Employees.tsx` — 员工管理

**作用：** 管理所有工人的信息，支持增删改查。

**核心功能：**
- 搜索栏（按姓名、工种、班组搜索）
- 员工数据表格：头像、姓名、手机号、工种、班组、日薪、状态（在职/离职）
- 添加/编辑弹窗表单：姓名*、手机号*、工种（下拉）、班组、日薪、状态
- 删除确认弹窗
- 分页功能（每页10条）

**调用的 API：**
- `GET /api/v1/admin/workers` — 获取员工列表
- `POST /api/v1/admin/workers` — 新增员工
- `PUT /api/v1/admin/workers/{id}` — 修改员工
- `DELETE /api/v1/admin/workers/{id}` — 删除员工

---

### 7.3 `src/pages/admin/Projects.tsx` — 项目管理

**作用：** 管理所有项目，支持增删改查。

**核心功能：**
- 搜索栏和状态筛选
- 项目数据表格，显示名称、负责人、日期、状态、进度、预算
- 顶部展示预算最高的重点项目
- 添加/编辑弹窗、查看详情弹窗、删除确认弹窗
- 分页功能

**调用的 API：**
- `GET /api/v1/projects` — 获取项目列表
- `POST /api/v1/projects` — 新增项目
- `PUT /api/v1/projects/{id}` — 修改项目
- `DELETE /api/v1/projects/{id}` — 删除项目

---

### 7.4 `src/pages/admin/Attendance.tsx` — 考勤管理

**作用：** 管理员查看和管理全局考勤数据。

**核心功能：**
- 三个标签页：
  - **员工考勤：** 员工列表，可查看/编辑每人每天的考勤记录
  - **项目考勤：** 按项目汇总，查看每日出勤明细
  - **异常管理：** 考勤异常列表，可审批通过或驳回
- 所有列表支持搜索和分页

**调用的 API：**
- `GET /api/v1/attendance/summary` — 考勤汇总
- `GET /api/v1/boss/employees` — 员工考勤列表
- `GET /api/v1/foreman/exceptions` — 异常列表
- `GET /api/v1/boss/employee-detail` — 员工考勤详情
- `GET /api/v1/boss/project-attendance-detail` — 项目考勤详情
- `PUT /api/v1/admin/attendance/{id}` — 修改考勤记录

---

### 7.5 `src/pages/admin/Settings.tsx` — 系统设置

**作用：** 管理员配置系统参数。

**核心功能：**
- **考勤规则：** 上班/下班时间、迟到宽限、加班阈值、工时计算模式
- **项目默认值：** 预算单位、默认状态、进度预警、编号前缀
- **通知设置：** 异常提醒、周报推送、延迟提醒、日报汇总（开关切换）
- **数据管理：** 导出数据、同步数据、清除缓存（按钮）

> ⚠️ **注意：** 这个页面目前所有设置都只存在页面本地状态中，点保存会提示"暂未持久化"，**没有真正调用后端 API**。

---

## 八、共享页面（shared）

> 这些页面被多个角色共用（工人/班组长/老板），根据角色显示不同内容。

### 8.1 `src/pages/shared/Workbench.tsx` — 移动端工作台

**作用：** 手机端"工作台"页面，提供快捷入口和待办事项。

**核心功能：**
- 用户信息卡片（头像、姓名、角色）
- 快捷入口网格（施工日报、费用报销，老板还有合同管理、项目成本等）
- 待办事项列表（从后端获取，显示未完成的任务）
- 点击待办跳转到对应页面

**调用的 API：**
- `GET /api/v1/todos?status=pending` — 获取待办事项

---

### 8.2 `src/pages/shared/DailyReport.tsx` — 施工日报

**作用：** 工人和班组长填写施工日报。

**核心功能：**
- 三个标签页：写日报 / 历史记录 / 模板管理
- **写日报：** 选择模板（可选）、填写内容、上传照片（最多9张）、提交
- **历史记录：** 已提交的日报列表，老板可审核
- **模板管理：** 查看系统模板，创建/编辑/删除个人模板

**调用的 API：**
- `GET /api/v1/reports/templates` — 获取日报模板
- `POST /api/v1/reports/templates` — 创建模板
- `PUT /api/v1/reports/templates/{id}` — 修改模板
- `DELETE /api/v1/reports/templates/{id}` — 删除模板
- `GET /api/v1/reports/history` — 日报历史
- `POST /api/v1/reports` — 提交日报
- `PUT /api/v1/reports/{id}/review` — 审核日报

---

### 8.3 `src/pages/shared/Reimbursement.tsx` — 费用报销

**作用：** 工人/班组长提交报销，老板审批报销。

**核心功能：**
- 三个标签页：申请 / 审批 / 历史
- **申请：** 填写金额、费用类型、原因、上传发票照片
- **审批（老板角色可见）：** 查看待审批列表，可通过或驳回（驳回需填原因）
- **历史：** 搜索和查看历史报销记录

**调用的 API：**
- `GET /api/v1/reimbursements/pending` — 待审批列表
- `GET /api/v1/reimbursements/history` — 报销历史
- `POST /api/v1/reimbursements` — 提交报销
- `PUT /api/v1/reimbursements/{id}/approve` — 审批报销

---

### 8.4 `src/pages/shared/workbenchTodos.ts` — 待办事项数据转换工具

**作用：** 纯逻辑文件。把后端返回的待办数据转换成前端展示用的卡片格式。

---

## 九、布局和路由组件

### 9.1 `src/App.tsx` — 路由总入口

**作用：** 定义整个应用的路由结构和页面跳转规则。

**核心逻辑：**
- `/login` 路径使用 `GuestGuard`（已登录用户自动跳走）
- `/admin/*` 路径使用 `WebAdminLayout`（电脑端侧边栏），只允许 admin 角色
- 其他路径使用 `MobileShell`（手机端底部导航），只允许 worker/foreman/boss 角色
- 内置 `RoleSync` 组件：从登录信息同步用户角色，Mock 模式支持 URL 参数切换角色

---

### 9.2 `src/components/MobileShell.tsx` — 手机端外壳

**作用：** 包裹所有手机端页面，提供底部导航栏。

**底部导航按钮（按角色不同）：**

| 工人 | 班组长 | 老板 |
|------|--------|------|
| 打卡 | 记工 | 首页 |
| 考勤 | 考勤 | 考勤 |
| 统计 | 异常 | 报销 |
| 工作台 | 工作台 | 工作台 |

---

### 9.3 `src/components/WebAdminLayout.tsx` — 电脑端外壳

**作用：** 包裹管理员所有页面，提供左侧导航栏和顶部标题栏。

**侧边栏菜单：** 仪表盘 / 项目管理 / 员工管理 / 考勤管理 / 系统设置

**顶部栏：** 面包屑导航 + 用户头像和退出按钮

---

### 9.4 `src/components/AuthGuard.tsx` — 登录验证守卫

**作用：** 保护需要登录才能访问的页面。未登录跳转到登录页，角色不符跳转到对应首页。

---

### 9.5 `src/components/GuestGuard.tsx` — 游客守卫

**作用：** 保护登录页本身。已登录用户访问 `/login` 时自动跳转到自己的首页。

---

### 9.6 `src/components/ErrorBoundary.tsx` — 错误边界

**作用：** 捕获页面渲染过程中的 JS 错误，防止整个应用白屏。出错时显示一个友好的错误提示页面。

---

## 十、状态管理（store）

### 10.1 `src/store/useAuthStore.ts` — 登录状态

**作用：** 存储用户的登录信息，持久化到浏览器 localStorage。

**存储内容：**
- `accessToken` — 访问令牌
- `refreshToken` — 刷新令牌
- `user` — 用户信息（id、手机号、姓名、角色、头像）
- `isAuthenticated` — 是否已登录

**持久化 key：** `auth-storage`

---

### 10.2 `src/store/useAppStore.ts` — 应用状态

**作用：** 存储当前用户角色，持久化到 localStorage。

**存储内容：**
- `role` — 当前角色（worker/foreman/boss/admin）

**持久化 key：** `app-role-storage`

---

## 十一、API 服务层（services）

### 11.1 `src/services/auth.ts` — 登录服务

**作用：** 封装登录和刷新令牌的 API 调用。

- `login({ phone, password })` → `POST /api/v1/auth/login`
- `refresh(refreshToken)` → `POST /api/v1/auth/refresh`

---

### 11.2 `src/services/worker.ts` — 工人服务

**作用：** 封装工人相关的 API 调用。

- `getTodayStatus()` → `GET /api/v1/worker/today-status`
- `punch({ type, latitude, longitude })` → `POST /api/v1/worker/punch`

---

### 11.3 `src/services/foreman.ts` — 班组长服务

**作用：** 封装班组长相关的所有 API 调用。

- `getProjects()` → `GET /api/v1/foreman/projects`
- `getWorkers()` → `GET /api/v1/foreman/workers`
- `getTodayAttendance(projectId)` → `GET /api/v1/foreman/attendance/today`
- `submitAttendance(data)` → `POST /api/v1/foreman/attendance`
- `getSiteStatus()` → `GET /api/v1/foreman/site-status`
- `getExceptions()` → `GET /api/v1/foreman/exceptions`
- `processException(id, data)` → `POST /api/v1/foreman/exceptions/{id}/process`
- `rejectException(id, data)` → `POST /api/v1/foreman/exceptions/{id}/reject`

---

## 十二、自定义 Hooks（hooks）

### 12.1 `src/hooks/useForeman.ts` — 班组长数据 Hooks

**作用：** 封装班组长的数据获取逻辑，自动管理加载状态和错误处理。

**导出三个 Hook：**
- `useForemanWorkbench()` — 记工页面数据（项目列表、工人列表、今日已提交记录、提交记工）
- `useForemanSite()` — 今日现场数据
- `useForemanExceptions()` — 异常列表和处理操作

---

## 十三、核心工具库（lib）

### 13.1 `src/lib/api.ts` — API 请求核心层

**作用：** 整个项目最核心的文件。提供统一的 `request()` 函数处理所有 API 请求。

**核心特性：**
- **双模式运行：** `VITE_MOCK_ENABLED=true` 时使用 Mock 数据，`false` 时发送真实请求
- **Mock 模式：** 600ms 延迟模拟网络，支持完整的增删改查操作，数据持久化到 localStorage
- **真实模式：** 自动附加 Token、401 时自动刷新令牌、刷新失败跳转登录页
- **文件上传：** 提供 `uploadFile()` 和 `uploadFiles()` 函数

**Mock 数据存储（全部共享统一数据源）：**

| 存储 | 用途 | localStorage key |
|------|------|------------------|
| 管理员员工数据 | 所有工人相关接口共用 | `mock-admin-workers` |
| 班组长月度考勤 | 记工提交后的月度数据 | `mock-foreman-attendance-monthly` |
| 班组长今日考勤 | 当天的记工记录 | `mock-foreman-attendance-today` |
| 项目列表 | 项目 CRUD | 内存（刷新丢失） |
| 合同数据 | 收入/支出合同 | 内存（刷新丢失） |
| 结算数据 | 收入结算 | 内存（刷新丢失） |

---

### 13.2 `src/lib/utils.ts` — 工具函数

**作用：** 提供 `cn()` 函数用于合并 Tailwind CSS 类名。

---

### 13.3 `src/lib/logger.ts` — 日志工具

**作用：** 统一的日志输出工具，支持 info/warn/error/debug 四个级别。

---

## 十四、类型定义（types）

### 14.1 `src/types/api.ts` — API 响应类型

- `ApiResponse<T>` — 标准响应格式：`{ code, message, data }`
- `PaginatedData<T>` — 分页数据格式：`{ list, total, page, pageSize }`

---

### 14.2 `src/types/auth.ts` — 登录相关类型

- `User` — 用户信息（id, phone, name, role, avatar）
- `LoginRequest` — 登录请求（phone, password）
- `LoginResponse` — 登录响应（accessToken, refreshToken, user）
- `RefreshResponse` — 刷新令牌响应

---

### 14.3 `src/types/models.ts` — 业务模型类型

定义了所有业务数据的 TypeScript 类型，包括：

| 类型名 | 说明 |
|--------|------|
| `Worker` | 工人信息（姓名、工种、手机号、日薪、状态） |
| `Project` | 项目信息（名称、负责人、日期、状态、进度、预算） |
| `SiteStatus` | 现场状态（项目名、总人数、已到人数、照片） |
| `Exception` | 考勤异常（工人、日期、原因、状态） |
| `BossEmployee` | 老板端员工视图（含项目、出勤状态） |
| `AdminProject` | 管理员项目视图（含预算、进度、地址） |
| `AdminAttendanceRecord` | 管理员考勤记录 |

---

## 十五、UI 基础组件（components/ui）

> 这些是 shadcn/ui 风格的基础组件，被各页面引用。

| 文件 | 说明 |
|------|------|
| `button.tsx` | 标准按钮组件（shadcn/ui，支持多种变体：default/outline/ghost/destructive） |
| `OldButton.tsx` | 旧版按钮组件（带加载状态和橙色渐变，部分页面仍在使用） |
| `Card.tsx` | 卡片容器 |
| `Input.tsx` | 输入框 |
| `textarea.tsx` | 多行文本输入框 |
| `dialog.tsx` | 弹窗组件（对话框） |
| `command.tsx` | 命令面板（搜索选择器） |
| `popover.tsx` | 气泡弹出层 |
| `input-group.tsx` | 输入框组合（带前/后缀图标） |
| `Pagination.tsx` | 分页组件 |
| `List.tsx` | 列表组件 |
| `Skeleton.tsx` | 骨架屏（加载占位） |
| `Toast.tsx` | 轻提示组件（操作成功/失败提示） |

---

## 十六、Mock 数据文件（public/mock/）

> 这些 JSON 文件为 Mock 模式提供静态数据。注意：部分已被共享内存数据源替代。

| 文件 | 提供数据的页面 |
|------|---------------|
| `foreman-workers.json` | 工人列表初始数据（现已接入共享数据源） |
| `boss-employees.json` | 老板端员工列表（现已接入共享数据源） |
| `boss-home.json` | 老板经营首页 |
| `boss-employee-detail.json` | 员工考勤详情（降级备用） |
| `boss-project-attendance-detail.json` | 项目考勤详情（降级备用） |
| `boss-project-cost.json` | 项目成本 |
| `foreman-projects.json` | 班组长项目列表 |
| `foreman-site-status.json` | 今日现场 |
| `foreman-exceptions.json` | 考勤异常 |
| `foreman-attendance-monthly.json` | 班组长月度考勤（初始数据） |
| `foreman-attendance-today.json` | 班组长今日考勤（初始数据） |
| `attendance.json` | 考勤汇总 |
| `projects.json` | 项目列表 |
| `project-detail.json` | 项目详情 |
| `contracts.json` | 合同数据 |
| `income-settlements.json` | 收入结算数据 |
| `worker-attendance-monthly.json` | 工人月度考勤 |
| `worker-stats.json` | 工人统计 |
| `person-records.json` | 个人考勤记录 |
| `employee-records.json` | 员工考勤记录 |
| `reimbursement-overview.json` | 报销概览 |
| `reimbursement-approvals.json` | 待审批报销 |
| `reimbursement-history.json` | 报销历史 |
| `project-reimbursement-detail.json` | 项目报销详情 |
| `daily-report-templates.json` | 日报模板 |
| `daily-report-history.json` | 日报历史 |

---

## 十七、页面路由速查表

### 工人端（worker）

| 路径 | 页面文件 | 功能 |
|------|----------|------|
| `/` | `worker/Home.tsx` | 打卡 |
| `/attendance` | `worker/Attendance.tsx` | 考勤日历 |
| `/stats` | `worker/Stats.tsx` | 月度统计 |
| `/workbench` | `shared/Workbench.tsx` | 工作台 |
| `/daily-report` | `shared/DailyReport.tsx` | 施工日报 |
| `/reimbursement` | `shared/Reimbursement.tsx` | 费用报销 |

### 班组长端（foreman）

| 路径 | 页面文件 | 功能 |
|------|----------|------|
| `/` | `foreman/Workbench.tsx` | 批量记工 |
| `/foreman-attendance` | `foreman/Attendance.tsx` | 考勤日历 |
| `/exceptions` | `foreman/Exceptions.tsx` | 异常处理 |
| `/site` | `foreman/Site.tsx` | 今日现场 |
| `/workbench` | `shared/Workbench.tsx` | 工作台 |
| `/daily-report` | `shared/DailyReport.tsx` | 施工日报 |
| `/reimbursement` | `shared/Reimbursement.tsx` | 费用报销 |

### 老板端（boss）

| 路径 | 页面文件 | 功能 |
|------|----------|------|
| `/` | `boss/Home.tsx` | 经营首页 |
| `/attendance` | `boss/Attendance.tsx` | 考勤总览 |
| `/employee-attendance` | `boss/EmployeeAttendance.tsx` | 员工考勤 |
| `/employee-detail/:id` | `boss/EmployeeDetail.tsx` | 员工详情 |
| `/project-attendance/:name` | `boss/ProjectAttendanceDetail.tsx` | 项目考勤 |
| `/boss/projects` | `boss/ProjectList.tsx` | 项目列表 |
| `/boss/contracts` | `boss/Contracts.tsx` | 合同管理 |
| `/boss/income-settlement` | `boss/IncomeSettlement.tsx` | 收入结算 |
| `/boss/project-cost` | `boss/ProjectCost.tsx` | 项目成本 |
| `/boss/reimbursement-overview` | `boss/ReimbursementOverview.tsx` | 报销总览 |
| `/boss/reimbursement-project/:name` | `boss/ProjectReimbursementDetail.tsx` | 项目报销 |
| `/workbench` | `shared/Workbench.tsx` | 工作台 |
| `/daily-report` | `shared/DailyReport.tsx` | 施工日报 |
| `/reimbursement` | `shared/Reimbursement.tsx` | 费用报销 |

### 管理员端（admin）

| 路径 | 页面文件 | 功能 |
|------|----------|------|
| `/admin/` | `admin/Dashboard.tsx` | 仪表盘 |
| `/admin/projects` | `admin/Projects.tsx` | 项目管理 |
| `/admin/employees` | `admin/Employees.tsx` | 员工管理 |
| `/admin/attendance` | `admin/Attendance.tsx` | 考勤管理 |
| `/admin/settings` | `admin/Settings.tsx` | 系统设置 |
