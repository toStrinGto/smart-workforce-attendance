# 智工考勤 (Smart Workforce Attendance) 后端开发文档

## 文档说明

本文档基于前端代码的完整逆向分析，定义了后端需要实现的全部接口契约。涵盖数据库设计、43 个 API 端点、认证鉴权、角色权限及业务逻辑。

---

## 1. 技术选型建议

| 层级 | 推荐方案 | 说明 |
|------|---------|------|
| 框架 | Spring Boot 3.x + Java 17+ | 用户已确认使用 Spring Boot |
| ORM | MyBatis-Plus 或 JPA | MyBatis-Plus 更灵活，适合复杂查询 |
| 数据库 | MySQL 8.0+ | 主库；考勤数据量较大建议按月分表 |
| 缓存 | Redis | Token 黑名单、刷新令牌存储、考勤统计缓存 |
| 认证 | Spring Security + JWT | 自签名 access/refresh 双令牌 |
| 文件存储 | MinIO / 阿里云 OSS | 打卡照片、报销凭证、日报图片 |
| API 风格 | RESTful JSON | 统一响应信封 `{code, message, data}` |

---

## 2. 数据库设计

### 2.1 ER 关系概览

```
user ──1:N──> attendance_record
user ──1:N──> exception
user ──1:N──> reimbursement
user ──1:N──> daily_report
project ──1:N──> attendance_record
project ──1:N──> contract
project ──1:N──> income_settlement
project ──1:N──> reimbursement
project ──1:N──> daily_report
project ──1:N──> project_worker (关联工人)
project ──1:N──> exception
```

### 2.2 表结构

#### `user` 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 用户 ID |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | 手机号（登录名） |
| password | VARCHAR(255) | NOT NULL | 密码（BCrypt 加密） |
| name | VARCHAR(50) | NOT NULL | 姓名 |
| role | ENUM('worker','foreman','boss','admin') | NOT NULL | 角色 |
| avatar | VARCHAR(255) | NULL | 头像 URL |
| daily_wage | DECIMAL(10,2) | NULL | 日薪（仅 worker 有值） |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

#### `project` 项目表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 项目 ID |
| name | VARCHAR(100) | NOT NULL | 项目名称 |
| manager | VARCHAR(50) | NOT NULL | 项目经理 |
| start_date | DATE | NOT NULL | 开工日期 |
| status | ENUM('未开工','施工中','维保中','已完工') | NOT NULL, DEFAULT '未开工' | 项目状态 |
| progress | TINYINT | NOT NULL, DEFAULT 0 | 进度 0-100 |
| budget | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | 预算（元） |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

#### `project_worker` 项目-工人关联表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | |
| project_id | BIGINT | FK -> project.id | 项目 |
| worker_id | BIGINT | FK -> user.id | 工人 |
| team | VARCHAR(50) | NOT NULL | 班组（如"木工班组"） |
| role | VARCHAR(50) | NOT NULL | 工种（如"木工"） |
| created_at | DATETIME | NOT NULL | |

**唯一约束**: `(project_id, worker_id)`

#### `attendance_record` 考勤记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | |
| worker_id | BIGINT | FK -> user.id, NOT NULL | 工人 |
| project_id | BIGINT | FK -> project.id, NOT NULL | 项目 |
| date | DATE | NOT NULL | 考勤日期 |
| clock_in | TIME | NULL | 上班打卡时间 |
| clock_out | TIME | NULL | 下班打卡时间 |
| status | ENUM('present','absent','late','early_leave','missing_in','missing_out') | NOT NULL | 考勤状态 |
| day_shift | DECIMAL(4,1) | NOT NULL, DEFAULT 0 | 出勤天数（支持 0.5） |
| overtime_hours | DECIMAL(4,1) | NOT NULL, DEFAULT 0 | 加班时长（小时） |
| notes | VARCHAR(500) | NULL | 备注 |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**唯一约束**: `(worker_id, project_id, date)`

#### `exception` 考勤异常表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | |
| worker_id | BIGINT | FK -> user.id, NOT NULL | 工人 |
| project_id | BIGINT | FK -> project.id, NOT NULL | 项目 |
| date | DATE | NOT NULL | 异常日期 |
| reason | VARCHAR(200) | NOT NULL | 异常原因 |
| status | ENUM('pending','handled','rejected') | NOT NULL, DEFAULT 'pending' | 处理状态 |
| handler_id | BIGINT | FK -> user.id, NULL | 处理人 |
| handle_day_shift | DECIMAL(4,1) | NULL | 处理后班次 |
| handle_overtime_hours | DECIMAL(4,1) | NULL | 处理后加班时长 |
| handle_notes | VARCHAR(500) | NULL | 处理备注 |
| reject_reason | VARCHAR(500) | NULL | 驳回原因 |
| handled_at | DATETIME | NULL | 处理时间 |
| created_at | DATETIME | NOT NULL | |

#### `contract` 合同表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | VARCHAR(30) | PK | 编号如 "INC-2026-001" |
| type | ENUM('income','expense') | NOT NULL | 收入/支出 |
| name | VARCHAR(100) | NOT NULL | 合同名称 |
| party | VARCHAR(100) | NOT NULL | 对方单位 |
| amount | DECIMAL(15,2) | NOT NULL | 金额（元） |
| date | DATE | NOT NULL | 签约日期 |
| status | ENUM('active','completed') | NOT NULL, DEFAULT 'active' | 状态 |
| content | TEXT | NULL | 合同内容描述 |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

#### `income_settlement` 收入结算表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | VARCHAR(30) | PK | 编号 |
| payer | VARCHAR(100) | NOT NULL | 付款方 |
| project_id | BIGINT | FK -> project.id, NOT NULL | 项目 |
| entry_time | DATE | NOT NULL | 入账时间 |
| billing_period | VARCHAR(50) | NOT NULL | 账期（如"2026年2月"） |
| category | ENUM('进度款','结算款') | NOT NULL | 类别 |
| amount | DECIMAL(15,2) | NOT NULL | 税前金额 |
| tax_rate | DECIMAL(5,2) | NOT NULL | 税率（如 9.00 表示 9%） |
| total_amount | DECIMAL(15,2) | NOT NULL | 含税总额 |
| attachments | JSON | NULL | 附件文件名数组 |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

#### `reimbursement` 报销表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | |
| applicant_id | BIGINT | FK -> user.id, NOT NULL | 申请人 |
| project_id | BIGINT | FK -> project.id, NULL | 项目（可选） |
| type | VARCHAR(50) | NOT NULL | 类型（材料费/交通费/餐饮费） |
| amount | DECIMAL(10,2) | NOT NULL | 金额 |
| reason | VARCHAR(500) | NOT NULL | 事由 |
| images | JSON | NULL | 凭证图片 URL 数组 |
| status | ENUM('pending','approved','rejected','paid') | NOT NULL, DEFAULT 'pending' | 状态 |
| approver_id | BIGINT | FK -> user.id, NULL | 审批人 |
| approved_at | DATETIME | NULL | 审批时间 |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

#### `daily_report_template` 日报模板表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | |
| name | VARCHAR(100) | NOT NULL | 模板名称 |
| content | TEXT | NOT NULL | 模板内容 |
| creator_id | BIGINT | FK -> user.id, NOT NULL | 创建人 |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

#### `daily_report` 日报表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | |
| author_id | BIGINT | FK -> user.id, NOT NULL | 作者 |
| project_id | BIGINT | FK -> project.id, NOT NULL | 项目 |
| template_id | BIGINT | FK -> daily_report_template.id, NULL | 使用的模板 |
| content | TEXT | NOT NULL | 日报内容 |
| images | JSON | NULL | 图片 URL 数组 |
| report_date | DATE | NOT NULL | 日报日期 |
| status | ENUM('submitted','reviewed') | NOT NULL, DEFAULT 'submitted' | 状态 |
| reviewer_id | BIGINT | FK -> user.id, NULL | 审阅人 |
| reviewed_at | DATETIME | NULL | 审阅时间 |
| created_at | DATETIME | NOT NULL | |

#### `refresh_token` 刷新令牌表（或 Redis）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | |
| user_id | BIGINT | FK -> user.id, NOT NULL | 用户 |
| token | VARCHAR(255) | UNIQUE, NOT NULL | 令牌值 |
| expires_at | DATETIME | NOT NULL | 过期时间 |
| created_at | DATETIME | NOT NULL | |

> 建议使用 Redis 存储 refresh_token，设置 TTL 自动过期。

---

## 3. 统一响应格式

所有接口返回 JSON，使用统一信封：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": 401,
  "message": "手机号或密码错误",
  "data": null
}
```

### 常用错误码

| code | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / 认证失败 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 数据冲突（如重复打卡） |
| 500 | 服务器内部错误 |

### 请求头

```
Content-Type: application/json
Authorization: Bearer <accessToken>
```

### 分页响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

> 前端已定义 `PaginatedData<T>` 接口（`src/types/api.ts`），但当前大部分列表接口未使用分页。建议后端对列表接口统一支持分页参数 `?page=1&pageSize=10`。

---

## 4. 认证鉴权

### 4.1 JWT 双令牌机制

| 令牌 | 有效期 | 用途 |
|------|--------|------|
| accessToken | 2 小时 | 接口鉴权，放在 `Authorization: Bearer <token>` |
| refreshToken | 30 天 | 刷新 accessToken，放在请求体中 |

### 4.2 Token 刷新流程

```
前端请求 → 401 → 前端调用 POST /auth/refresh {refreshToken}
         → 成功 → 拿到新 accessToken + refreshToken → 重试原请求
         → 失败 → 前端 logout() → 跳转 /login
```

前端实现了并发刷新队列（`src/lib/api.ts` lines 17-29）：多个请求同时收到 401 时，只发一次 refresh，其余排队等待新 token 后自动重试。

**后端实现要求**：
- refresh 成功后，旧 accessToken 应立即失效（Redis 黑名单或版本号机制）
- 新 refreshToken 签发后，旧 refreshToken 作废
- 同时只允许一个有效的 refresh 操作（防止并发刷新导致 token 混乱）

### 4.3 角色权限矩阵

| 端点前缀 | worker | foreman | boss | admin |
|----------|--------|---------|------|-------|
| `/auth/**` | ALL | ALL | ALL | ALL |
| `/worker/**` | YES | - | - | YES |
| `/foreman/**` | - | YES | YES | YES |
| `/boss/**` | - | - | YES | YES |
| `/admin/**` | - | - | - | YES |
| `/projects` | - | YES | YES | YES |
| `/attendance/summary` | - | - | YES | YES |
| `/contracts/**` | - | - | YES | - |
| `/income-settlements/**` | - | - | YES | - |
| `/reimbursement/**` | YES | YES | YES | - |
| `/reimbursements/**` | YES | YES | YES | - |
| `/reports/**` | YES | YES | YES | - |

> 注意：boss 角色的 `ProjectCost` 页面调用了 `/foreman/projects` 和 `/foreman/workers`，后端需允许 boss 访问这些端点。admin 同样需要访问 foreman 端点。

---

## 5. 完整 API 端点规范

### 5.1 认证模块

#### EP-01 POST `/api/v1/auth/login` 登录

**权限**: 无需认证

**请求体**:
```json
{
  "phone": "13800000001",
  "password": "123456"
}
```

**成功响应 `data`**:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "dGhpcyBpcyBh...",
  "user": {
    "id": 1,
    "phone": "13800000001",
    "name": "张三",
    "role": "worker",
    "avatar": "https://..."
  }
}
```

**错误码**: 401（手机号或密码错误）

---

#### EP-02 POST `/api/v1/auth/refresh` 刷新令牌

**权限**: 无需认证

**请求体**:
```json
{
  "refreshToken": "dGhpcyBpcyBh..."
}
```

**成功响应 `data`**:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "bmV3IHJlZnJl..."
}
```

**错误码**: 401（refresh token 无效或已过期）

---

### 5.2 工人模块

#### EP-03 GET `/api/v1/worker/attendance/monthly` 月度考勤日历

**权限**: worker, admin

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | YES | 月份，格式 `yyyy-MM`，如 `2026-04` |

**响应 `data`**: 以日期为 key 的对象
```json
{
  "2026-04-01": {
    "status": "normal",
    "in": "07:52",
    "out": "18:30",
    "pic": "https://oss.example.com/punch/1.jpg",
    "reason": null
  },
  "2026-04-02": {
    "status": "abnormal",
    "in": "08:15",
    "out": "18:00",
    "pic": null,
    "reason": "迟到"
  },
  "2026-04-05": {
    "status": "missing",
    "in": null,
    "out": null,
    "pic": null,
    "reason": "未打卡"
  }
}
```

**status 枚举**: `"normal"` | `"abnormal"` | `"missing"` | `"overtime"`
**time 格式**: `"HH:mm"` 或 `null`

---

#### EP-04 GET `/api/v1/worker/stats` 工人月度统计

**权限**: worker, admin

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | YES | 月份，格式 `yyyy-MM` |

**响应 `data`**:
```json
{
  "normalDays": 22,
  "overtimeHours": 18.5,
  "abnormalDays": 2,
  "totalEarnings": 8650
}
```

**计算逻辑**:
- `normalDays` = 该月 status=normal 的天数
- `overtimeHours` = 该月所有记录的 overtime_hours 之和
- `abnormalDays` = 该月 status=abnormal 或 missing 的天数
- `totalEarnings` = (normalDays × dailyWage) + (overtimeHours × overtimeRate)

---

### 5.3 班组长模块

#### EP-05 GET `/api/v1/foreman/projects` 班组长的项目列表

**权限**: foreman, boss, admin

**响应 `data`**:
```json
[
  { "id": 1, "name": "绿地中心二期项目部", "team": "木工班组", "count": 12 },
  { "id": 2, "name": "万达广场三期", "team": "水电班组", "count": 8 }
]
```

**说明**: 返回当前班组长所负责的项目。boss 和 admin 可获取所有项目。

---

#### EP-06 GET `/api/v1/foreman/workers` 工人列表

**权限**: foreman, boss, admin

**响应 `data`**:
```json
[
  { "id": 1, "name": "张三", "role": "木工", "avatar": "张", "dailyWage": 350 },
  { "id": 2, "name": "李四", "role": "钢筋工", "avatar": "李", "dailyWage": 380 }
]
```

**说明**: foreman 获取自己班组下的工人；boss/admin 获取全部。`dailyWage` 可选。

---

#### EP-07 POST `/api/v1/foreman/attendance` 批量提交考勤

**权限**: foreman, admin

**请求体**:
```json
{
  "projectId": 1,
  "records": [
    { "workerId": 1, "dayShift": 1, "overtimeHours": 2 },
    { "workerId": 2, "dayShift": 0.5, "overtimeHours": 0 },
    { "workerId": 3, "dayShift": 0, "overtimeHours": 0 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| projectId | number | 项目 ID |
| records[].workerId | number | 工人 ID |
| records[].dayShift | number | 出勤天数（0/0.5/1） |
| records[].overtimeHours | number | 加班时长（小时） |

**响应 `data`**: `null`

**业务逻辑**:
- 对每个 worker，创建或更新当天的 `attendance_record`
- dayShift=0 时 status='absent'；>0 时 status='present'
- overtimeHours > 0 时标记加班

---

#### EP-08 GET `/api/v1/foreman/site-status` 现场状态

**权限**: foreman, admin

**响应 `data`**:
```json
{
  "projectName": "绿地中心二期项目部",
  "totalWorkers": 12,
  "checkedIn": 10,
  "missing": 2,
  "photos": [
    { "id": 1, "name": "张三", "time": "07:50", "pic": "https://oss.example.com/punch/1.jpg" }
  ]
}
```

---

#### EP-09 GET `/api/v1/foreman/exceptions` 异常列表

**权限**: foreman, boss, admin

**响应 `data`**:
```json
[
  { "id": 1, "name": "张三", "date": "2026-04-17", "reason": "缺下班卡", "status": "pending" },
  { "id": 2, "name": "李四", "date": "2026-04-17", "reason": "迟到", "status": "handled" }
]
```

**status 枚举**: `"pending"` | `"handled"` | `"rejected"`

---

#### EP-10 POST `/api/v1/foreman/exceptions/{id}/process` 审批异常（通过）

**权限**: foreman, admin

**路径参数**: `id` — 异常记录 ID

**请求体**:
```json
{
  "dayShift": 1,
  "overtimeHours": 0,
  "notes": "已确认正常出勤"
}
```

**响应 `data`**: `null`

**业务逻辑**:
- 将 exception.status 更新为 `"handled"`
- 同步更新对应的 attendance_record（day_shift, overtime_hours）
- 记录 handler_id 和 handled_at

---

#### EP-11 POST `/api/v1/foreman/exceptions/{id}/reject` 驳回异常

**权限**: foreman, admin

**路径参数**: `id` — 异常记录 ID

**请求体**:
```json
{
  "reason": "无法核实，请补交证明"
}
```

**响应 `data`**: `null`

**业务逻辑**:
- 将 exception.status 更新为 `"rejected"`
- 记录 reject_reason

---

### 5.4 老板看板模块

#### EP-12 GET `/api/v1/dashboard/boss` 老板首页仪表盘

**权限**: boss, admin

**响应 `data`**:
```json
{
  "briefing": {
    "incomeContract": "45.2M",
    "incomeSettlement": "38.5M",
    "collectionAmount": "32.1M",
    "invoiceAmount": "35.0M"
  },
  "projects": {
    "activeCount": 12,
    "invoicedUncollected": "2.9M",
    "paidUninvoiced": "1.5M",
    "pendingRepayment": "850K"
  },
  "reimbursements": [
    { "name": "绿地中心二期", "amount": "45,200", "count": 8, "percent": 85 }
  ]
}
```

> 前端 mock 中金额为格式化字符串。建议后端返回原始数值，前端格式化。但若需与现有前端兼容，也可返回字符串。需与前端开发确认。

---

#### EP-13 GET `/api/v1/attendance/summary` 考勤总览

**权限**: boss, admin

**响应 `data`**:
```json
{
  "summary": {
    "totalPresent": 438,
    "presentRate": 95.2,
    "totalOvertime": 155,
    "overtimeGrowth": 12,
    "monthlyHours": 76800
  },
  "projects": [
    { "id": 1, "name": "绿地中心二期项目部", "total": 120, "present": 115, "absent": 5, "overtime": 45, "status": "施工中" }
  ],
  "dailyTrend": [
    { "date": "2026-04-17", "count": 438, "label": "4/17 周四" }
  ]
}
```

| 字段 | 说明 |
|------|------|
| summary.totalPresent | 今日总出勤人数 |
| summary.presentRate | 出勤率（%） |
| summary.totalOvertime | 总加班人次 |
| summary.overtimeGrowth | 加班增长率（%） |
| summary.monthlyHours | 本月总工时 |
| projects[] | 每个项目今日出勤统计 |
| dailyTrend[] | 近 7 天出勤趋势 |

---

### 5.5 老板 — 员工与考勤详情

#### EP-14 GET `/api/v1/boss/employees` 今日员工出勤列表

**权限**: boss, admin

**响应 `data`**:
```json
[
  {
    "id": 1, "name": "张三", "team": "木工班组", "project": "绿地中心二期项目部",
    "status": "present", "time": "07:50", "overtime": 2
  },
  {
    "id": 3, "name": "王五", "team": "泥瓦班组", "project": "高新区科技园",
    "status": "absent", "time": null, "overtime": 0, "reason": "请假"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| status | `"present"` \| `"absent"` | 今日状态 |
| time | string \| null | 打卡时间 `"HH:mm"` |
| overtime | number | 加班小时 |
| reason | string | 可选，缺勤原因 |

---

#### EP-15 GET `/api/v1/boss/employee-detail` 员工考勤详情

**权限**: boss, admin

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | YES | 员工 ID |

**响应 `data`**:
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
    { "id": 7, "date": "2026-04-07", "status": "absent", "time": null, "overtime": 0 }
  ]
}
```

---

#### EP-16 GET `/api/v1/boss/project-attendance-detail` 项目考勤详情

**权限**: boss, admin

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | YES | 项目名称（URL 编码） |

**响应 `data`**:
```json
{
  "summary": {
    "total": 120, "present": 115, "absent": 5, "overtime": 45,
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

---

#### EP-17 GET `/api/v1/workers/{id}/attendance` 个人考勤记录

**权限**: boss, admin

**路径参数**: `id` — 工人 ID

**响应 `data`**:
```json
[
  { "id": 1, "status": "正常出勤", "dayHours": 8, "overtimeHours": 2, "location": "绿地中心二期项目部" },
  { "id": 2, "status": "缺勤", "dayHours": 0, "overtimeHours": 0, "location": "绿地中心二期项目部" }
]
```

**status 枚举（中文）**: `"正常出勤"` | `"缺勤"`

---

### 5.6 老板 — 合同管理

#### EP-18 GET `/api/v1/contracts` 合同列表

**权限**: boss

**响应 `data`**:
```json
{
  "income": [
    { "id": "INC-2026-001", "name": "绿地中心二期施工合同", "party": "绿地集团", "amount": 45200000, "date": "2026-01-15", "status": "active", "content": "..." }
  ],
  "expense": [
    { "id": "EXP-2026-001", "name": "钢材采购合同", "party": "宝钢集团", "amount": 5000000, "date": "2026-02-01", "status": "active", "content": "..." }
  ]
}
```

**contract.status 枚举**: `"active"` | `"completed"`

---

#### EP-19 POST `/api/v1/contracts` 新建合同

**权限**: boss

**请求体**:
```json
{
  "type": "income",
  "contract": {
    "id": "INC-2026-005",
    "name": "新合同名称",
    "party": "对方单位",
    "amount": 1000000,
    "date": "2026-04-18",
    "status": "active",
    "content": "合同内容描述"
  }
}
```

**响应 `data`**: `null`

---

#### EP-20 PUT `/api/v1/contracts/{id}` 编辑合同

**权限**: boss

**路径参数**: `id` — 合同编号（如 `"INC-2026-001"`）

**请求体**: 同 POST

**响应 `data`**: `null`

---

#### EP-21 DELETE `/api/v1/contracts/{id}` 删除合同

**权限**: boss

**路径参数**: `id` — 合同编号

**响应 `data`**: `null`

---

### 5.7 老板 — 收入结算

#### EP-22 GET `/api/v1/income-settlements` 结算列表

**权限**: boss

**响应 `data`**:
```json
[
  {
    "id": "INC-SET-1711240001",
    "payer": "绿地集团",
    "project": "绿地中心二期项目部",
    "entryTime": "2026-03-20",
    "billingPeriod": "2026年2月",
    "category": "进度款",
    "amount": 500000,
    "taxRate": 9,
    "totalAmount": 545000,
    "attachments": ["发票扫描件.pdf"]
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| category | `"进度款"` \| `"结算款"` | 类别 |
| amount | number | 税前金额 |
| taxRate | number | 税率（9 = 9%） |
| totalAmount | number | 含税总额 = amount × (1 + taxRate/100) |
| attachments | string[] | 附件文件名 |

---

#### EP-23 POST `/api/v1/income-settlements` 新建结算

#### EP-24 PUT `/api/v1/income-settlements/{id}` 编辑结算

#### EP-25 DELETE `/api/v1/income-settlements/{id}` 删除结算

**请求体**（POST/PUT）: 同 EP-22 中单个对象结构

**权限**: boss

**响应 `data`**: `null`

---

### 5.8 老板 — 项目成本

#### EP-26 GET `/api/v1/boss/project-cost` 项目成本详情

**权限**: boss, admin

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | number | YES | 项目 ID |

**响应 `data`**: 按项目 ID 分 key 的对象
```json
{
  "1": {
    "attendance": [
      { "workerId": 1, "date": "2026-04-01", "dayShift": 1, "overtimeHours": 2 }
    ],
    "reimbursements": [
      { "id": 1, "amount": 2500, "description": "材料采购", "date": "2026-04-05" }
    ],
    "workers": [
      { "id": 1, "name": "张三", "role": "木工", "avatar": "张", "dailyWage": 350 }
    ]
  }
}
```

---

### 5.9 老板 — 报销管理

#### EP-27 GET `/api/v1/reimbursement/overview` 报销总览

**权限**: boss

**响应 `data`**:
```json
{
  "summary": {
    "totalAmount": "125,800",
    "pendingCount": 5,
    "approvedCount": 23,
    "rejectedCount": 2
  },
  "projects": [
    { "id": "P001", "name": "绿地中心二期", "totalAmount": "45,200", "pendingCount": 2, "approvedCount": 8, "percent": 85 }
  ]
}
```

> 金额字段当前为格式化字符串，建议后端返回数值 + 前端格式化。

---

#### EP-28 GET `/api/v1/reimbursement/project-detail` 项目报销详情

**权限**: boss

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectName | string | YES | 项目名称 |

**响应 `data`**:
```json
{
  "projectName": "绿地中心二期",
  "summary": { "totalAmount": "45,200", "pendingAmount": "5,300", "approvedAmount": "39,900" },
  "categories": [
    { "name": "材料采购", "amount": "25,000", "percent": 55 },
    { "name": "机械租赁", "amount": "12,000", "percent": 27 }
  ],
  "recentRecords": [
    { "id": "R001", "applicant": "张三", "category": "材料采购", "amount": "2,500", "date": "2026-04-15", "status": "pending", "reason": "购买水泥", "images": [] }
  ]
}
```

---

#### EP-29 GET `/api/v1/reimbursements/pending` 待审批报销

**权限**: boss

**响应 `data`**:
```json
[
  { "id": 101, "applicant": "张三", "role": "木工班组长", "date": "2026-04-15", "type": "材料费", "amount": 1500, "reason": "购买五金件", "status": "待审批" }
]
```

---

#### EP-30 GET `/api/v1/reimbursements/history` 报销历史

**权限**: worker, foreman, boss（各角色只看自己的记录）

**响应 `data`**:
```json
{
  "summary": { "pendingAmount": 120.5, "reimbursedAmount": 560 },
  "history": [
    { "id": 1, "applicant": "我", "date": "2026-04-10", "type": "材料费", "amount": 150, "reason": "购买工具", "status": "已打款", "statusColor": "text-emerald-600 bg-emerald-50 border-emerald-100" }
  ]
}
```

> `statusColor` 为前端 CSS 类名，建议后端不返回此字段，前端根据 status 自行映射样式。

---

#### EP-31 PUT `/api/v1/reimbursements/{id}/approve` 审批报销

**权限**: boss

**路径参数**: `id` — 报销 ID

**请求体**:
```json
{ "approved": true }
```

- `approved: true` → status 更新为 `"approved"`
- `approved: false` → status 更新为 `"rejected"`

**响应 `data`**: `null`

---

#### EP-32 POST `/api/v1/reimbursements` 提交报销

**权限**: worker, foreman, boss

**请求体**:
```json
{
  "type": "材料费",
  "amount": 1500,
  "reason": "购买五金件",
  "images": ["https://oss.example.com/receipt/1.jpg"]
}
```

**响应 `data`**: `null`

---

### 5.10 共享 — 日报模块

#### EP-33 GET `/api/v1/reports/templates` 日报模板列表

**权限**: worker, foreman, boss

**响应 `data`**:
```json
[
  { "id": 1, "name": "通用施工日报", "content": "1. 施工内容\n2. 人员情况\n3. 安全情况\n4. 明日计划" }
]
```

---

#### EP-34 POST `/api/v1/reports/templates` 新建模板

**权限**: foreman, boss

**请求体**:
```json
{ "name": "模板名称", "content": "模板内容..." }
```

**响应 `data`**: `null`

---

#### EP-35 PUT `/api/v1/reports/templates/{id}` 编辑模板

**权限**: foreman, boss

**路径参数**: `id` — 模板 ID

**请求体**: 同 POST

**响应 `data`**: `null`

---

#### EP-36 GET `/api/v1/reports/history` 日报历史

**权限**: worker, foreman, boss

**响应 `data`**:
```json
[
  { "id": 101, "date": "2026-03-21", "summary": "完成基础浇筑", "status": "已阅", "boss": "王总" }
]
```

---

#### EP-37 POST `/api/v1/reports` 提交日报

**权限**: worker, foreman, boss

**请求体**:
```json
{
  "templateId": 1,
  "content": "日报内容...",
  "images": ["https://oss.example.com/report/1.jpg"]
}
```

**响应 `data`**: `null`

---

### 5.11 管理员 — 项目管理

#### EP-38 GET `/api/v1/projects` 项目列表

**权限**: admin, boss

**响应 `data`**:
```json
[
  { "id": "P001", "name": "绿地中心二期项目部", "manager": "张经理", "startDate": "2026-01-15", "status": "施工中", "progress": 65, "budget": 15000000 }
]
```

**status 枚举**: `"未开工"` | `"施工中"` | `"维保中"` | `"已完工"`

---

#### EP-39 POST `/api/v1/projects` 新建项目

**权限**: admin

**请求体**:
```json
{
  "id": "P006",
  "name": "新项目名称",
  "manager": "项目经理",
  "startDate": "2026-05-01",
  "status": "未开工",
  "progress": 0,
  "budget": 5000000
}
```

**响应 `data`**: `null`

---

#### EP-40 PUT `/api/v1/projects/{id}` 编辑项目

**权限**: admin

**路径参数**: `id` — 项目 ID（如 `"P001"`）

**请求体**: 同 POST

**响应 `data`**: `null`

---

#### EP-41 DELETE `/api/v1/projects/{id}` 删除项目

**权限**: admin

**路径参数**: `id` — 项目 ID

**响应 `data`**: `null`

---

### 5.12 管理员 — 员工与考勤管理

#### EP-42 PUT `/api/v1/admin/workers/{id}/wage` 修改工人日薪

**权限**: admin

**路径参数**: `id` — 工人 ID

**请求体**:
```json
{ "dailyWage": 380 }
```

**响应 `data`**: `null`

---

#### EP-43 PUT `/api/v1/admin/attendance/{id}` 修改考勤记录

**权限**: admin

**路径参数**: `id` — 考勤记录 ID

**请求体**:
```json
{
  "status": "present",
  "overtime": 2,
  "notes": "管理员手动修正"
}
```

**响应 `data`**: `null`

---

## 6. 需统一的前后端不一致项

以下是前端 mock 中存在的不一致，后端开发时需统一：

| # | 问题 | 建议 |
|---|------|------|
| 1 | **项目 ID 类型不一致**: `AdminProject.id` 为 string（"P001"），`Project.id` 为 number（1） | 统一为 BIGINT number，前端 `AdminProject.id` 改为 number |
| 2 | **项目状态枚举不一致**: `attendance.json` 用 `"已完成"`，`projects.json` 用 `"已完工"` | 统一为 `"已完工"` |
| 3 | **考勤状态枚举不统一**: worker 用 `"normal"/"abnormal"/"missing"/"overtime"`，boss 用 `"present"/"absent"`，person-records 用 `"正常出勤"/"缺勤"` | 数据库统一存储英文枚举，各接口按场景映射返回 |
| 4 | **金额格式不一致**: 部分接口返回 number，部分返回格式化 string（如 "45,200"、"45.2M"） | 统一返回 number，前端负责格式化 |
| 5 | **报销状态中英混用**: pending approvals 用 `"待审批"`，project detail 用 `"pending"` | 统一英文枚举，前端翻译 |
| 6 | **reimbursement-history 含 statusColor 字段**: CSS 类名不应由后端返回 | 后端不返回，前端根据 status 映射 |
| 7 | **reimbursement-project-detail 未传项目参数**: 前端代码注释说生产环境应传参 | 后端要求 `?projectName=` 参数 |
| 8 | **boss 端点命名用 query 而非 path param**: 如 `boss/employee-detail?id=1` 而非 `boss/employees/1` | 可保持当前风格（前端已实现），也可改为 RESTful 风格 |

---

## 7. 文件上传规范

### 7.1 上传接口

建议统一一个上传端点，各业务模块引用返回的 URL：

```
POST /api/v1/upload
Content-Type: multipart/form-data

参数:
- file: 文件二进制（支持 jpg/png/pdf）
- type: 业务类型（punch / receipt / report / attachment）

响应:
{
  "code": 200,
  "message": "success",
  "data": {
    "url": "https://oss.example.com/punch/2026/04/17/abc123.jpg"
  }
}
```

### 7.2 文件约束

| 业务 | 允许格式 | 最大大小 |
|------|---------|---------|
| 打卡照片 | jpg/png | 5 MB |
| 报销凭证 | jpg/png/pdf | 10 MB |
| 日报图片 | jpg/png | 10 MB |
| 结算附件 | jpg/png/pdf | 20 MB |

---

## 8. 缺失端点（前端已模拟但无正式 API）

| 端点 | 说明 | 优先级 |
|------|------|--------|
| `POST /api/v1/worker/punch` | 工人打卡（上传照片 + GPS + 时间戳） | HIGH |
| `GET /api/v1/worker/today-status` | 工人今日打卡状态（已上班？已下班？） | HIGH |

**打卡接口建议设计**:

```
POST /api/v1/worker/punch
Content-Type: multipart/form-data

参数:
- photo: 打卡照片文件
- latitude: 纬度
- longitude: 经度
- type: "in" | "out" (上班打卡/下班打卡)

响应:
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 12345,
    "time": "07:50",
    "type": "in"
  }
}
```

---

## 9. 数据库索引建议

```sql
-- 考勤查询高频索引
CREATE INDEX idx_attendance_worker_date ON attendance_record(worker_id, date);
CREATE INDEX idx_attendance_project_date ON attendance_record(project_id, date);
CREATE INDEX idx_attendance_date ON attendance_record(date);

-- 异常查询
CREATE INDEX idx_exception_status ON exception(status);
CREATE INDEX idx_exception_project ON exception(project_id);

-- 报销查询
CREATE INDEX idx_reimbursement_status ON reimbursement(status);
CREATE INDEX idx_reimbursement_applicant ON reimbursement(applicant_id);
CREATE INDEX idx_reimbursement_project ON reimbursement(project_id);

-- 日报查询
CREATE INDEX idx_report_author_date ON daily_report(author_id, report_date);
CREATE INDEX idx_report_project ON daily_report(project_id);

-- 合同查询
CREATE INDEX idx_contract_type ON contract(type);
CREATE INDEX idx_contract_project ON contract(project_id);
```

---

## 10. 开发优先级建议

### Phase 1: 核心功能（必须先完成）
1. 用户表 + 认证（login/refresh）
2. 项目表 + CRUD
3. 工人管理 + 日薪
4. 考勤记录表 + 批量提交
5. 考勤异常表 + 审批

### Phase 2: 查看功能
6. 考勤总览（summary）
7. 工人月度考勤 + 统计
8. 打卡照片上传
9. 现场状态

### Phase 3: 老板功能
10. 老板仪表盘
11. 合同管理 CRUD
12. 收入结算 CRUD
13. 报销提交 + 审批
14. 项目成本核算

### Phase 4: 辅助功能
15. 日报模板 + 提交 + 历史
16. 文件上传服务
17. 管理员考勤编辑
18. 系统设置（考勤规则等，需新建 setting 表）

---

## 11. 接口总览表（43 个端点）

| # | 方法 | 路径 | 权限 | 状态 |
|---|------|------|------|------|
| 01 | POST | /api/v1/auth/login | ALL | 必需 |
| 02 | POST | /api/v1/auth/refresh | ALL | 必需 |
| 03 | GET | /api/v1/worker/attendance/monthly | worker,admin | 必需 |
| 04 | GET | /api/v1/worker/stats | worker,admin | 必需 |
| 05 | GET | /api/v1/foreman/projects | foreman,boss,admin | 必需 |
| 06 | GET | /api/v1/foreman/workers | foreman,boss,admin | 必需 |
| 07 | POST | /api/v1/foreman/attendance | foreman,admin | 必需 |
| 08 | GET | /api/v1/foreman/site-status | foreman,admin | 必需 |
| 09 | GET | /api/v1/foreman/exceptions | foreman,boss,admin | 必需 |
| 10 | POST | /api/v1/foreman/exceptions/{id}/process | foreman,admin | 必需 |
| 11 | POST | /api/v1/foreman/exceptions/{id}/reject | foreman,admin | 必需 |
| 12 | GET | /api/v1/dashboard/boss | boss,admin | 必需 |
| 13 | GET | /api/v1/attendance/summary | boss,admin | 必需 |
| 14 | GET | /api/v1/boss/employees | boss,admin | 必需 |
| 15 | GET | /api/v1/boss/employee-detail | boss,admin | 必需 |
| 16 | GET | /api/v1/boss/project-attendance-detail | boss,admin | 必需 |
| 17 | GET | /api/v1/workers/{id}/attendance | boss,admin | 必需 |
| 18 | GET | /api/v1/contracts | boss | 必需 |
| 19 | POST | /api/v1/contracts | boss | 必需 |
| 20 | PUT | /api/v1/contracts/{id} | boss | 必需 |
| 21 | DELETE | /api/v1/contracts/{id} | boss | 必需 |
| 22 | GET | /api/v1/income-settlements | boss | 必需 |
| 23 | POST | /api/v1/income-settlements | boss | 必需 |
| 24 | PUT | /api/v1/income-settlements/{id} | boss | 必需 |
| 25 | DELETE | /api/v1/income-settlements/{id} | boss | 必需 |
| 26 | GET | /api/v1/boss/project-cost | boss,admin | 必需 |
| 27 | GET | /api/v1/reimbursement/overview | boss | 必需 |
| 28 | GET | /api/v1/reimbursement/project-detail | boss | 必需 |
| 29 | GET | /api/v1/reimbursements/pending | boss | 必需 |
| 30 | GET | /api/v1/reimbursements/history | worker,foreman,boss | 必需 |
| 31 | PUT | /api/v1/reimbursements/{id}/approve | boss | 必需 |
| 32 | POST | /api/v1/reimbursements | worker,foreman,boss | 必需 |
| 33 | GET | /api/v1/reports/templates | worker,foreman,boss | 必需 |
| 34 | POST | /api/v1/reports/templates | foreman,boss | 必需 |
| 35 | PUT | /api/v1/reports/templates/{id} | foreman,boss | 必需 |
| 36 | GET | /api/v1/reports/history | worker,foreman,boss | 必需 |
| 37 | POST | /api/v1/reports | worker,foreman,boss | 必需 |
| 38 | GET | /api/v1/projects | admin,boss | 必需 |
| 39 | POST | /api/v1/projects | admin | 必需 |
| 40 | PUT | /api/v1/projects/{id} | admin | 必需 |
| 41 | DELETE | /api/v1/projects/{id} | admin | 必需 |
| 42 | PUT | /api/v1/admin/workers/{id}/wage | admin | 必需 |
| 43 | PUT | /api/v1/admin/attendance/{id} | admin | 必需 |

---

## 12. 验证方式

1. 使用 Postman / Apifox 逐接口测试
2. 前端关闭 mock 模式（`VITE_MOCK_ENABLED=false`），配置 `VITE_API_BASE_URL` 指向后端
3. 使用 4 个测试账号验证各角色流程
4. 重点验证：Token 刷新、并发请求、权限拦截、数据一致性
