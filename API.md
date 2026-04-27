# API 接口文档

## 通用说明

### Base URL

```
开发环境：/api/v1（由 VITE_API_BASE_URL 配置）
```

### 统一响应格式

所有接口返回 JSON，统一包装为：

```json
{
  "code": 200,
  "message": "success",
  "data": T
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 业务状态码，200 表示成功 |
| message | string | 状态描述 |
| data | T | 业务数据，类型因接口而异 |

### 错误响应

```json
{
  "code": 404,
  "message": "未找到Mock路由: /api/v1/xxx"
}
```

### 请求头

```
Content-Type: application/json
```

---

## 1. Worker（工人）

### 1.1 GET /api/v1/worker/attendance/monthly

获取工人月度考勤记录（日历视图）。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | 是 | 月份，格式 `yyyy-MM`，如 `2026-04` |

**响应 data**

`Record<string, DayRecord>` — 键为日期字符串（`"2026-04-01"`），值为当日考勤记录：

```json
{
  "2026-04-01": {
    "status": "normal",
    "in": "07:50",
    "out": "18:10",
    "pic": "https://picsum.photos/seed/wa1/200/200"
  },
  "2026-04-03": {
    "status": "abnormal",
    "in": "08:15",
    "out": "18:00",
    "pic": "https://picsum.photos/seed/wa3/200/200",
    "reason": "迟到"
  },
  "2026-04-08": {
    "status": "missing",
    "in": "07:50",
    "out": null,
    "pic": "https://picsum.photos/seed/wa6/200/200",
    "reason": "缺下班卡"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| status | `"normal"` \| `"abnormal"` \| `"overtime"` \| `"missing"` | 考勤状态：正常/异常/加班/缺卡 |
| in | string \| null | 上班打卡时间，如 `"07:50"` |
| out | string \| null | 下班打卡时间，如 `"18:10"` |
| pic | string \| null | 打卡照片 URL |
| reason | string | 异常原因（仅 abnormal/missing 时存在） |

---

### 1.2 GET /api/v1/worker/stats

获取工人月度统计数据。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | 是 | 月份，格式 `yyyy-MM`，如 `2026-04` |

**响应 data**

```json
{
  "normalDays": 22,
  "overtimeHours": 18.5,
  "abnormalDays": 2,
  "totalEarnings": 8650
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| normalDays | number | 正常出勤天数 |
| overtimeHours | number | 加班总时长（小时） |
| abnormalDays | number | 异常考勤次数（迟到/早退/缺卡） |
| totalEarnings | number | 累计收入（元） |

---

## 2. Foreman（班组长）

### 2.1 GET /api/v1/foreman/projects

获取班组长管理的项目列表。

**响应 data**

```json
[
  { "id": 1, "name": "绿地中心二期项目部", "team": "木工班组", "count": 12 },
  { "id": 2, "name": "万达广场三期", "team": "泥瓦班组", "count": 8 }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 项目 ID |
| name | string | 项目名称 |
| team | string | 班组名称 |
| count | number | 班组人数 |

---

### 2.2 GET /api/v1/foreman/workers

获取班组长管理的工人列表。

**响应 data**

```json
[
  { "id": 1, "name": "张三", "role": "木工", "avatar": "张" },
  { "id": 2, "name": "李四", "role": "钢筋工", "avatar": "李" }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 工人 ID |
| name | string | 姓名 |
| role | string | 工种 |
| avatar | string | 头像（姓名首字） |
| dailyWage | number | 日薪（可选） |

---

### 2.3 POST /api/v1/foreman/attendance

班组长批量提交考勤记录。

**请求体**

```json
{
  "projectId": 1,
  "records": [
    { "workerId": 1, "dayShift": 1, "overtimeHours": 2 },
    { "workerId": 2, "dayShift": 1, "overtimeHours": 0 }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | number | 是 | 项目 ID |
| records | AttendanceRecord[] | 是 | 考勤记录数组 |

**AttendanceRecord**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| workerId | number | 是 | 工人 ID |
| dayShift | number | 是 | 白班个数（0 或 1） |
| overtimeHours | number | 是 | 加班时长（小时，0.5 递增） |

**响应 data**: `null`

---

### 2.4 GET /api/v1/foreman/site-status

获取今日现场状况。

**响应 data**

```json
{
  "projectName": "绿地中心二期项目部",
  "totalWorkers": 12,
  "checkedIn": 10,
  "missing": 2,
  "photos": [
    { "id": 1, "name": "张三", "time": "07:50", "pic": "https://..." }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| projectName | string | 项目名称 |
| totalWorkers | number | 总人数 |
| checkedIn | number | 已签到人数 |
| missing | number | 未签到人数 |
| photos | Photo[] | 签到照片列表 |

**Photo**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 照片 ID |
| name | string | 工人姓名 |
| time | string | 签到时间 |
| pic | string | 照片 URL |

---

### 2.5 GET /api/v1/foreman/exceptions

获取考勤异常列表。

**响应 data**

```json
[
  { "id": 1, "name": "张三", "date": "2026-03-22", "reason": "缺下班卡", "status": "pending" },
  { "id": 2, "name": "李四", "date": "2026-03-22", "reason": "迟到", "status": "handled" }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 异常记录 ID |
| name | string | 工人姓名 |
| date | string | 异常日期 |
| reason | string | 异常原因 |
| status | `"pending"` \| `"handled"` \| `"rejected"` | 状态：待处理/已处理/已驳回 |

---

### 2.6 POST /api/v1/foreman/exceptions/:id/process

处理考勤异常（确认）。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 异常记录 ID |

**请求体**

```json
{
  "dayShift": 1,
  "overtimeHours": 0,
  "notes": "已核实，补记白班"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dayShift | number | 是 | 补记白班个数 |
| overtimeHours | number | 是 | 补记加班时长（小时） |
| notes | string | 否 | 处理备注 |

**响应 data**: `null`

---

### 2.7 POST /api/v1/foreman/exceptions/:id/reject

驳回考勤异常。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 异常记录 ID |

**请求体**

```json
{
  "reason": "无法核实，请补充材料"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reason | string | 是 | 驳回原因 |

**响应 data**: `null`

---

## 3. Boss（老板）— 首页与考勤

### 3.1 GET /api/v1/dashboard/boss

获取老板首页仪表盘数据。

**响应 data**

```json
{
  "briefing": {
    "incomeContract": "45.2M",
    "incomeSettlement": "38.5M",
    "collectionAmount": "32.1M",
    "invoiceAmount": "35.0M"
  },
  "projects": {
    "activeCount": 5,
    "invoicedUncollected": "2.9M",
    "paidUninvoiced": "1.5M",
    "pendingRepayment": "800K"
  },
  "reimbursements": [
    { "name": "绿地中心二期项目部", "amount": "45,200", "count": 12, "percent": 85 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| briefing.incomeContract | string | 收入合同总额 |
| briefing.incomeSettlement | string | 收入结算总额 |
| briefing.collectionAmount | string | 收款金额 |
| briefing.invoiceAmount | string | 开票金额 |
| projects.activeCount | number | 进行中项目数 |
| projects.invoicedUncollected | string | 合同已开票未收款 |
| projects.paidUninvoiced | string | 合同已付款未收票 |
| projects.pendingRepayment | string | 待还款 |
| reimbursements | ReimbursementProject[] | 各项目报销情况 |

**ReimbursementProject**

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 项目名称 |
| amount | string | 报销金额 |
| count | number | 待审核/已报销笔数 |
| percent | number | 占比百分比（用于进度条） |

---

### 3.2 GET /api/v1/attendance/summary

获取考勤总览（按项目汇总）。

**响应 data**

```json
[
  {
    "status": "present",
    "overtime": 2
  }
]
```

> 注：当前 mock 数据结构较简单（7 条记录，按周分组）。后端应返回按项目维度的考勤汇总。

---

### 3.3 GET /api/v1/boss/employees

获取今日员工考勤列表。

**响应 data**

```json
[
  {
    "id": 1,
    "name": "张三",
    "team": "木工班组",
    "project": "绿地中心二期项目部",
    "status": "present",
    "time": "07:50",
    "overtime": 2
  },
  {
    "id": 3,
    "name": "王五",
    "team": "泥瓦班组",
    "project": "高新区科技园",
    "status": "absent",
    "time": null,
    "overtime": 0,
    "reason": "请假"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 员工 ID |
| name | string | 姓名 |
| team | string | 班组 |
| project | string | 所属项目 |
| status | `"present"` \| `"absent"` | 出勤状态 |
| time | string \| null | 打卡时间（出勤时） |
| overtime | number | 加班时长（小时） |
| reason | string | 缺勤原因（仅 absent 时存在） |

---

### 3.4 GET /api/v1/boss/employee-detail

获取单个员工的考勤详情。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 员工 ID |

**响应 data**

```json
{
  "employeeId": 1,
  "employeeName": "张三",
  "team": "木工班组",
  "project": "绿地中心二期项目部",
  "summary": {
    "totalDays": 60,
    "presentDays": 55,
    "absentDays": 5,
    "overtimeHours": 48,
    "attendanceRate": 91.7
  },
  "records": [
    { "id": 1, "date": "2026-04-01", "status": "present", "time": "07:52", "overtime": 2 },
    { "id": 5, "date": "2026-04-07", "status": "absent", "time": null, "overtime": 0 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| employeeId | number | 员工 ID |
| employeeName | string | 姓名 |
| team | string | 班组 |
| project | string | 所属项目 |
| summary.totalDays | number | 统计总天数 |
| summary.presentDays | number | 出勤天数 |
| summary.absentDays | number | 缺勤天数 |
| summary.overtimeHours | number | 加班总时长 |
| summary.attendanceRate | number | 出勤率（%） |
| records | DailyRecord[] | 每日考勤记录 |

**DailyRecord**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 记录 ID |
| date | string | 日期 `yyyy-MM-dd` |
| status | `"present"` \| `"absent"` | 状态 |
| time | string \| null | 打卡时间 |
| overtime | number | 加班时长（小时） |

---

### 3.5 GET /api/v1/boss/project-attendance-detail

获取项目考勤详情（含每日汇总和工人列表）。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 项目名称（URL 编码） |

**响应 data**

```json
{
  "summary": {
    "total": 120,
    "present": 115,
    "absent": 5,
    "overtime": 45,
    "attendanceRate": 95.8
  },
  "workers": [
    { "id": 1, "name": "张三", "role": "木工班组", "presentDays": 22, "overtimeHours": 15 }
  ],
  "dailyRecords": [
    { "id": 1, "date": "2026-04-01", "present": 118, "absent": 2, "overtime": 35 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| summary.total | number | 总人次 |
| summary.present | number | 出勤人次 |
| summary.absent | number | 缺勤人次 |
| summary.overtime | number | 加班总时长 |
| summary.attendanceRate | number | 出勤率（%） |
| workers | WorkerSummary[] | 工人考勤汇总 |
| dailyRecords | DailySummary[] | 每日汇总 |

**WorkerSummary**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 工人 ID |
| name | string | 姓名 |
| role | string | 班组/工种 |
| presentDays | number | 出勤天数 |
| overtimeHours | number | 加班时长 |

**DailySummary**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 记录 ID |
| date | string | 日期 `yyyy-MM-dd` |
| present | number | 当日出勤人数 |
| absent | number | 当日缺勤人数 |
| overtime | number | 当日加班总时长 |

---

### 3.6 GET /api/v1/workers/:id/attendance

获取单个工人考勤记录（项目详情中的人员弹窗使用）。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 工人 ID |

**响应 data**

```json
[
  { "id": 1, "status": "正常出勤", "dayHours": 8, "overtimeHours": 2, "location": "绿地中心二期" },
  { "id": 2, "status": "缺勤", "dayHours": 0, "overtimeHours": 0, "location": "绿地中心二期" }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 记录 ID |
| status | string | 状态：`"正常出勤"` / `"缺勤"` |
| dayHours | number | 白班工时 |
| overtimeHours | number | 加班时长 |
| location | string | 打卡地点 |

---

### 3.7 GET /api/v1/boss/project-cost

获取项目成本数据（出勤 + 报销 + 工资）。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | number | 是 | 项目 ID |

**响应 data**

`Record<string, ProjectCostData>` — 键为项目 ID 字符串（`"1"`, `"2"`, `"3"`）：

```json
{
  "1": {
    "attendance": [
      { "workerId": 1, "date": "2026-04-01", "dayShift": 1, "overtimeHours": 2 }
    ],
    "reimbursements": [
      { "id": 1, "amount": 2500, "description": "木材采购", "date": "2026-04-05" }
    ],
    "workers": [
      { "id": 1, "name": "张三", "role": "木工", "avatar": "张", "dailyWage": 350 }
    ]
  }
}
```

**attendance 项**

| 字段 | 类型 | 说明 |
|------|------|------|
| workerId | number | 工人 ID |
| date | string | 日期 `yyyy-MM-dd` |
| dayShift | number | 白班（0 或 1） |
| overtimeHours | number | 加班时长 |

**reimbursements 项**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 报销 ID |
| amount | number | 金额（元） |
| description | string | 描述 |
| date | string | 日期 |

**workers 项**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 工人 ID |
| name | string | 姓名 |
| role | string | 工种 |
| avatar | string | 头像 |
| dailyWage | number | 日薪（元） |

---

## 4. Boss（老板）— 合同与结算

### 4.1 GET /api/v1/contracts

获取合同列表。

**响应 data**

```json
{
  "income": [
    {
      "id": "INC-2026-001",
      "name": "绿地中心二期工程总承包合同",
      "party": "绿地集团",
      "amount": 45200000,
      "date": "2026-01-15",
      "status": "active",
      "content": "负责绿地中心二期..."
    }
  ],
  "expense": [
    {
      "id": "EXP-2026-001",
      "name": "钢筋采购合同",
      "party": "宝钢集团",
      "amount": 5800000,
      "date": "2026-02-20",
      "status": "active",
      "content": "供应绿地中心二期..."
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 合同编号 |
| name | string | 合同名称 |
| party | string | 对方单位 |
| amount | number | 金额（元） |
| date | string | 签订日期 `yyyy-MM-dd` |
| status | `"active"` \| `"completed"` \| `"terminated"` | 状态 |
| content | string | 合同摘要 |

---

### 4.2 POST /api/v1/contracts

新建合同。

**请求体**

```json
{
  "type": "income",
  "contract": {
    "id": "INC-1700000000000",
    "name": "新合同名称",
    "party": "对方单位",
    "amount": 1000000,
    "date": "2026-04-01",
    "status": "active",
    "content": "合同内容摘要"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | `"income"` \| `"expense"` | 是 | 合同类型：收入/支出 |
| contract.id | string | 是 | 合同编号（前端生成） |
| contract.name | string | 是 | 合同名称 |
| contract.party | string | 是 | 对方单位 |
| contract.amount | number | 是 | 金额 |
| contract.date | string | 是 | 签订日期 |
| contract.status | string | 是 | 状态 |
| contract.content | string | 否 | 合同摘要 |

**响应 data**: `null`

---

### 4.3 PUT /api/v1/contracts/:id

编辑合同。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 合同编号 |

**请求体**: 与 POST 相同结构。

**响应 data**: `null`

---

### 4.4 DELETE /api/v1/contracts/:id

删除合同。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 合同编号 |

**响应 data**: `null`

---

### 4.5 GET /api/v1/income-settlements

获取收入结算列表。

**响应 data**

```json
[
  {
    "id": "INC-SET-1711240001",
    "payer": "城建集团第一分公司",
    "project": "市中心商业综合体项目",
    "entryTime": "2026-03-20",
    "billingPeriod": "2026年2月",
    "category": "进度款",
    "amount": 500000,
    "taxRate": 9,
    "totalAmount": 545000,
    "attachments": ["2月进度确认单.pdf"]
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 结算编号 |
| payer | string | 付款方 |
| project | string | 项目名称 |
| entryTime | string | 入账日期 `yyyy-MM-dd` |
| billingPeriod | string | 账期 |
| category | `"进度款"` \| `"结算款"` \| `"预付款"` \| `"质保金"` \| `"其他"` | 类别 |
| amount | number | 金额（税前，元） |
| taxRate | number | 税率（%） |
| totalAmount | number | 含税总额 = amount × (1 + taxRate/100) |
| attachments | string[] | 附件文件名列表 |

---

### 4.6 POST /api/v1/income-settlements

新建收入结算。

**请求体**: 与 GET 响应中单个结算对象结构相同。

**响应 data**: `null`

---

### 4.7 PUT /api/v1/income-settlements/:id

编辑收入结算。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 结算编号 |

**请求体**: 与 POST 相同结构。

**响应 data**: `null`

---

### 4.8 DELETE /api/v1/income-settlements/:id

删除收入结算。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 结算编号 |

**响应 data**: `null`

---

## 5. Boss（老板）— 报销

### 5.1 GET /api/v1/reimbursement/overview

获取各项目报销总览。

**响应 data**

```json
{
  "summary": {
    "totalAmount": "125,800",
    "pendingCount": 12,
    "approvedCount": 45,
    "rejectedCount": 3
  },
  "projects": [
    {
      "id": "P001",
      "name": "绿地中心二期项目部",
      "totalAmount": "45,200",
      "pendingCount": 3,
      "approvedCount": 15,
      "percent": 85
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| summary.totalAmount | string | 报销总额 |
| summary.pendingCount | number | 待审批数 |
| summary.approvedCount | number | 已批准数 |
| summary.rejectedCount | number | 已驳回数 |
| projects[].id | string | 项目 ID |
| projects[].name | string | 项目名称 |
| projects[].totalAmount | string | 项目报销额 |
| projects[].pendingCount | number | 待审批数 |
| projects[].approvedCount | number | 已批准数 |
| projects[].percent | number | 占比（%） |

---

### 5.2 GET /api/v1/reimbursement/project-detail

获取项目报销详情。

**响应 data**

```json
{
  "projectName": "绿地中心二期项目部",
  "summary": {
    "totalAmount": "45,200",
    "pendingAmount": "5,200",
    "approvedAmount": "40,000"
  },
  "categories": [
    { "name": "材料采购", "amount": "25,000", "percent": 55 }
  ],
  "recentRecords": [
    {
      "id": "R001",
      "applicant": "张建国",
      "category": "材料采购",
      "amount": "3,500",
      "date": "2026-03-23",
      "status": "pending",
      "reason": "购买二期工程所需的...",
      "images": ["https://..."]
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| projectName | string | 项目名称 |
| summary.totalAmount | string | 总金额 |
| summary.pendingAmount | string | 待审批金额 |
| summary.approvedAmount | string | 已批准金额 |
| categories[].name | string | 类别名称 |
| categories[].amount | string | 类别金额 |
| categories[].percent | number | 占比（%） |
| recentRecords[].id | string | 记录 ID |
| recentRecords[].applicant | string | 申请人 |
| recentRecords[].category | string | 类别 |
| recentRecords[].amount | string | 金额 |
| recentRecords[].date | string | 日期 |
| recentRecords[].status | `"pending"` \| `"approved"` | 状态 |
| recentRecords[].reason | string | 原因说明 |
| recentRecords[].images | string[] | 票据照片 URL |

---

### 5.3 GET /api/v1/reimbursements/pending

获取待审批报销列表（Boss 角色使用）。

**响应 data**

```json
[
  {
    "id": 101,
    "applicant": "张三",
    "role": "木工班组长",
    "date": "2026-03-22",
    "type": "材料费",
    "amount": 1500.00,
    "reason": "购买木工板材",
    "status": "待审批"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 报销 ID |
| applicant | string | 申请人 |
| role | string | 角色 |
| date | string | 申请日期 |
| type | string | 费用类型 |
| amount | number | 金额 |
| reason | string | 事由 |
| status | string | 状态 |

---

### 5.4 GET /api/v1/reimbursements/history

获取报销历史记录。

**响应 data**

```json
{
  "summary": {
    "pendingAmount": 120.50,
    "reimbursedAmount": 560.00
  },
  "history": [
    {
      "id": 1,
      "applicant": "我",
      "date": "2026-03-21",
      "type": "材料费",
      "amount": 560.00,
      "reason": "购买工地急需的五金配件",
      "status": "已打款",
      "statusColor": "text-emerald-600 bg-emerald-50 border-emerald-100"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| summary.pendingAmount | number | 待审批金额 |
| summary.reimbursedAmount | number | 已报销金额 |
| history[].id | number | 记录 ID |
| history[].applicant | string | 申请人 |
| history[].date | string | 日期 |
| history[].type | string | 费用类型 |
| history[].amount | number | 金额 |
| history[].reason | string | 事由 |
| history[].status | string | 状态：`"已打款"` / `"审批中"` / `"已驳回"` |

---

### 5.5 PUT /api/v1/reimbursements/:id/approve

审批报销（通过/驳回）。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 报销 ID |

**请求体**

```json
{ "approved": true }
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| approved | boolean | 是 | `true` 通过，`false` 驳回 |

**响应 data**: `null`

---

### 5.6 POST /api/v1/reimbursements

提交新报销申请。

**请求体**

```json
{
  "type": "材料费",
  "amount": 1500,
  "reason": "购买工地急需的五金配件",
  "images": ["blob:xxx"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | `"交通费"` \| `"餐饮费"` \| `"住宿费"` \| `"材料费"` \| `"办公费"` \| `"其他"` | 是 | 费用类型 |
| amount | number | 是 | 金额（元） |
| reason | string | 是 | 报销事由 |
| images | string[] | 否 | 票据照片（最多 9 张） |

**响应 data**: `null`

---

## 6. Admin（管理员）— 项目管理

### 6.1 GET /api/v1/projects

获取项目列表。

**响应 data**

```json
[
  {
    "id": "P001",
    "name": "绿地中心二期项目部",
    "manager": "张建国",
    "startDate": "2025-05-10",
    "status": "施工中",
    "progress": 65,
    "budget": 15000000
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 项目 ID |
| name | string | 项目名称 |
| manager | string | 项目经理 |
| startDate | string | 开工日期 `yyyy-MM-dd` |
| status | `"未开工"` \| `"施工中"` \| `"维保中"` \| `"已完工"` | 状态 |
| progress | number | 进度（%） |
| budget | number | 预算（元） |

---

### 6.2 POST /api/v1/projects

新建项目。

**请求体**: 与 GET 响应中单个项目结构相同（`id` 由前端生成）。

**响应 data**: `null`

---

### 6.3 PUT /api/v1/projects/:id

编辑项目。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 项目 ID |

**请求体**: 与 POST 相同结构。

**响应 data**: `null`

---

### 6.4 DELETE /api/v1/projects/:id

删除项目。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 项目 ID |

**响应 data**: `null`

---

## 7. 共享 — 日报

### 7.1 GET /api/v1/reports/templates

获取日报模板列表。

**响应 data**

```json
[
  {
    "id": 1,
    "name": "通用施工日报",
    "content": "1. 今日完成工作：\n\n2. 明日工作计划：..."
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 模板 ID |
| name | string | 模板名称 |
| content | string | 模板内容 |

---

### 7.2 POST /api/v1/reports/templates

新建日报模板。

**请求体**

```json
{
  "name": "模板名称",
  "content": "模板内容文本"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 模板名称 |
| content | string | 是 | 模板内容 |

**响应 data**: `null`

---

### 7.3 PUT /api/v1/reports/templates/:id

编辑日报模板。

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 模板 ID |

**请求体**: 与 POST 相同结构。

**响应 data**: `null`

---

### 7.4 GET /api/v1/reports/history

获取日报历史记录。

**响应 data**

```json
[
  {
    "id": 101,
    "date": "2026-03-21",
    "summary": "完成2号楼3层混凝土浇筑...",
    "status": "已阅",
    "boss": "王总"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 日报 ID |
| date | string | 提交日期 |
| summary | string | 内容摘要 |
| status | string | 状态：`"已阅"` / `"未读"` |
| boss | string | 审阅人 |

---

### 7.5 POST /api/v1/reports

提交日报。

**请求体**

```json
{
  "templateId": 1,
  "content": "今日完成工作内容...",
  "images": ["blob:xxx"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| templateId | number \| undefined | 否 | 使用的模板 ID |
| content | string | 是 | 日报内容 |
| images | string[] | 否 | 图片（最多 9 张） |

**响应 data**: `null`

---

## 8. Mock 路由映射

开发环境（`VITE_MOCK_ENABLED=true`）下，`request()` 函数通过正则匹配将 API 端点映射到 `public/mock/` 目录下的 JSON 文件。匹配顺序如下（首次匹配生效）：

| # | 端点正则 | Mock 文件 |
|---|---------|----------|
| 1 | `/api/v1/attendance/summary` | `attendance.json` |
| 2 | `/api/v1/projects/[^/]+/attendance` | `project-detail.json` |
| 3 | `/api/v1/workers/[^/]+/attendance` | `person-records.json` |
| 4 | `/api/v1/employees/[^/]+/attendance` | `employee-records.json` |
| 5 | `/api/v1/reimbursements/pending` | `reimbursement-approvals.json` |
| 6 | `/api/v1/reimbursements/history` | `reimbursement-history.json` |
| 7 | `/api/v1/reports/templates` | `daily-report-templates.json` |
| 8 | `/api/v1/reports/history` | `daily-report-history.json` |
| 9 | `/api/v1/dashboard/boss` | `boss-home.json` |
| 10 | `/api/v1/contracts` | `contracts.json` |
| 11 | `/api/v1/income-settlements` | `income-settlements.json` |
| 12 | `/api/v1/boss/project-attendance-detail` | `boss-project-attendance-detail.json` |
| 13 | `/api/v1/boss/project-cost` | `boss-project-cost.json` |
| 14 | `/api/v1/boss/employee-detail` | `boss-employee-detail.json` |
| 15 | `/api/v1/boss/employees` | `boss-employees.json` |
| 16 | `/api/v1/worker/attendance/monthly` | `worker-attendance-monthly.json` |
| 17 | `/api/v1/worker/stats` | `worker-stats.json` |
| 18 | `/api/v1/projects` | `projects.json` |
| 19 | `/api/v1/reimbursement/overview` | `reimbursement-overview.json` |
| 20 | `/api/v1/reimbursement/project-detail` | `project-reimbursement-detail.json` |
| 21 | `/api/v1/foreman/projects` | `foreman-projects.json` |
| 22 | `/api/v1/foreman/workers` | `foreman-workers.json` |
| 23 | `/api/v1/foreman/site-status` | `foreman-site-status.json` |
| 24 | `/api/v1/foreman/exceptions` | `foreman-exceptions.json` |

> 注意：非 GET 请求（POST/PUT/DELETE）在 Mock 模式下直接返回 `{ code: 200, message: "success", data: null }`，不执行实际数据修改。
