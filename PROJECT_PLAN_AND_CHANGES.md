# Project Plan and Change Log

### 2026-04-23 - 工头记工持久化与班组考勤文案修复
- 前端已切到后端 `GET /api/v1/foreman/attendance/today?projectId=...` 作为工头批量记工页的唯一回填来源。
- `src/hooks/useForeman.ts` 现在会：
  - 拉取项目列表后按项目读取工人列表和今日记工结果
  - 将 `today` 接口返回映射为 `submittedRecords`
  - 在 `POST /api/v1/foreman/attendance` 成功后重新拉取 `today`，避免前端本地状态漂移
- `src/pages/foreman/Workbench.tsx` 已删除页面内存里的伪持久化逻辑，不再手工假写“已记工”结果；刷新和重新登录后的展示都依赖读接口回填。
- `src/pages/worker/attendanceStatus.ts` 已将无打卡但非显式缺卡的记录改为稳定的 `recorded` 语义：
  - 日历绿色展示
  - 详情 badge 仍为 `未打卡`
  - 单边缺卡和显式 `missing/absent` 继续走红色 `缺卡`
- `src/pages/foreman/attendanceMonthly.ts` 已新增 `getUserFacingForemanReason(...)`：
  - 英文技术类 `reason` 不再原样展示
  - `missing` 兜底为 `部分工友存在缺卡记录`
  - `recorded` 兜底为 `班组已记工，暂无打卡记录`
- `src/pages/foreman/Attendance.tsx` 已接入上述原因文案兜底，并让 `recorded` 日期在班组考勤月历中显示绿色圆点。
- Mock 后端同步补齐：
  - 新增 `public/mock/foreman-attendance-today.json`
  - `src/lib/api.ts` 新增 `GET /api/v1/foreman/attendance/today`
  - `POST /api/v1/foreman/attendance` 会同步更新 mock `today` / `monthly` 数据
  - mock 数据通过 mock API 自己的 localStorage key 持久化，页面硬刷新后仍能回填
- 新增/更新测试：
  - `src/hooks/useForeman.test.tsx`
  - `src/pages/worker/attendanceStatus.test.ts`
  - `src/pages/foreman/attendanceMonthly.test.ts`
  - `src/lib/api.test.ts`
- 2026-04-23 真实联调补充结论：
  - `POST /api/v1/auth/login` 返回 `200`
  - `GET /api/v1/foreman/attendance/today?projectId=1` 仍返回 `500`
  - 因此前端这轮已经接好并做了失败兜底，但“刷新后真实回填张三已记工状态”在真实环境仍受后端接口阻塞

本文件作为项目后续计划、问题、修改、验证结果和后端配合事项的统一备份入口。以后新增计划和实际修改优先记录在这里，避免信息散落在多份临时文档中。

## Current Focus

当前重点：把从登录开始的主流程从 Mock/本地假数据逐步切到真实后端，并修复权限、工人打卡、文件上传、写操作返回值、老板端统计等关键闭环问题。

### 2026-04-22 - 项目考勤页筛选联动

- 前端修复：
  - `src/pages/boss/ProjectAttendanceDetail.tsx`
    - 项目明细表改为按真实日期区间过滤，不再按条数 `slice(...)` 裁剪。
    - 时间区间以当前数据集里的最新考勤日期为锚点，避免历史快照和系统当天日期错位。
    - “出勤人员名单 / 加班人员名单”弹层新增内层时间范围选择器，并和外层选择器双向同步。
    - 名单中的出勤天数、加班时长改为基于 `GET /api/v1/boss/employee-detail?id=...` 的带日期记录实时推导。
  - `src/pages/boss/ProjectAttendanceDetail.test.tsx`
    - 新增回归测试，覆盖外层筛选驱动明细表变化，以及内层选择器和外层联动。
- 验证结果：
  - `npx vitest run src/pages/boss/ProjectAttendanceDetail.test.tsx` 通过
  - `npm run test` 通过，`11` 个测试文件 / `38` 个用例
  - `npm run lint` 通过
  - Playwright 浏览器冒烟通过：
    - 周视图行数据正确缩到 `2026-04-20, 2026-04-21`
    - 人员名单弹层打开时内层选择器值为 `week`
    - 将内层选择器切到 `all` 后，外层选择器同步变为 `all`
    - 名单人数由 `1` 变为 `2`
- 联调备注：
  - 本轮验证时本地 Vite 代理目标 `localhost:8080` 不可达，所以浏览器冒烟采用前端拦截接口的方式，先确认筛选联动修复本身正确。

### 2026-04-23 - 工人考勤红点规则收窄

- 前端修复：
  - `src/pages/worker/attendanceStatus.ts`
    - 新增中性 `recorded` 状态。
    - 只有“只打上班卡/只打下班卡”或显式 `missing/absent` 才会进入红色 `缺卡` 路径。
    - 工头记工但 `in/out` 都为空的记录，改为 `已记工 / 未打卡`，不再直接判成缺卡。
  - `src/pages/worker/Attendance.tsx`
    - `recorded` 状态不再绘制日历红点。
    - 详情弹层里 `未打卡` 改为灰色 badge，避免和红色缺卡混淆。
  - `src/pages/worker/attendanceStatus.test.ts`
    - 新增“单边缺卡”和“双边未打卡”的回归测试。
- 验证结果：
  - `npx vitest run src/pages/worker/attendanceStatus.test.ts` 通过
  - `npm run test` 通过，`11` 个测试文件 / `40` 个用例
  - `npm run lint` 通过
  - Playwright 浏览器冒烟通过：
    - `2026-04-23`（工头记工、`in/out` 都为空）没有红点，详情显示两个灰色 `未打卡`
    - `2026-04-24`（只打上班卡）详情仍显示红色 `缺卡`

## Plans

### 2026-04-21 - 登录后主流程问题修复计划

目标：让 worker、foreman、boss、admin 四类角色在关闭 Mock 后仍可完成核心业务流程，并保证权限、数据一致性和可测试性。

前端侧计划：

- 路由权限：
  - `/admin/*` 增加 admin 角色校验。
  - 登录后的真实角色以 `authUser.role` 为准。
  - `?role=worker|foreman|boss` 仅作为本地 Mock/开发调试入口，真实登录状态下不允许通过 URL 切换身份。
- 工人打卡：
  - `worker/Home` 从真实接口读取当前用户、项目、今日打卡状态。
  - 点击打卡时获取定位并调用后端打卡接口。
  - 处理重复打卡、超出范围、定位失败、今日已完成等状态。
- Mock 写操作：
  - Mock 模式下为关键 POST/PUT/DELETE 增加内存状态，避免“提示成功但页面不变”。
- 文件上传：
  - 报销、日报、打卡图片不再提交 `blob:` 地址。
  - 前端先上传文件拿到 URL，再提交业务表单。
- 页面体验：
  - 老板考勤页增加明确“查看人员考勤明细”入口。
  - 未完成工作台入口改成禁用态或“即将上线”。
  - 图标按钮补充 `aria-label`。
- 测试：
  - Playwright 覆盖越权访问、工人打卡、老板考勤明细入口、报销/日报上传链路。
  - 单元测试覆盖权限判断、Mock 写状态、文件 URL 校验。

## Backend Coordination

### 2026-04-21 - 后端开发交付清单

本节可直接交给后端开发排期。目标是让前端关闭 Mock 后，登录、权限、工人打卡、考勤统计、报销、日报、文件上传、老板端查看和管理员管理流程都能闭环。

#### 1. 统一基础约定

后端所有接口统一使用以下响应结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

错误响应也必须保持相同结构：

```json
{
  "code": 403,
  "message": "无权限",
  "data": null
}
```

推荐错误码：

| code | 场景 | message 建议 |
| --- | --- | --- |
| 400 | 参数缺失、字段格式错误、坐标非法 | 请求参数错误 |
| 401 | 未登录、accessToken 过期、refreshToken 无效 | 登录已失效 |
| 403 | 已登录但角色无权限、超出打卡范围 | 无权限 |
| 404 | 资源不存在 | 资源不存在 |
| 409 | 重复打卡、状态冲突、有关联数据不能删除 | 数据状态冲突 |
| 422 | 表单业务校验失败 | 数据校验失败 |
| 500 | 服务端异常 | 服务器内部错误 |

统一数据规范：

- 项目 ID：统一为 number。
- 金额字段：统一为 number，前端负责格式化展示。
- 日期：统一 `yyyy-MM-dd`。
- 时间：统一 `HH:mm`。
- 日期时间：统一 ISO 字符串或 `yyyy-MM-dd HH:mm:ss`，同一项目内保持一致。
- 后端不要返回前端 CSS 类名，例如 `statusColor`。
- 同一接口内不要混用中文状态和英文状态。

建议枚举：

| 类型 | 枚举 |
| --- | --- |
| 角色 | `worker`, `foreman`, `boss`, `admin` |
| 报销状态 | `pending`, `approved`, `rejected`, `paid` |
| 考勤状态 | `present`, `absent`, `late`, `early_leave`, `missing_in`, `missing_out` |
| 打卡类型 | `in`, `out` |
| 日报状态 | `submitted`, `reviewed` |
| 合同状态 | `active`, `completed`, `terminated` |

#### 2. 认证与权限兜底 - P0

所有业务接口必须校验：

- 请求头：`Authorization: Bearer <accessToken>`。
- accessToken 有效性。
- 当前用户角色是否允许访问该接口。
- 用户只能操作自己权限范围内的数据，不能只依赖前端传参。

权限矩阵：

| 接口前缀 | worker | foreman | boss | admin |
| --- | --- | --- | --- | --- |
| `/api/v1/auth/**` | yes | yes | yes | yes |
| `/api/v1/worker/**` | yes | no | no | yes |
| `/api/v1/foreman/**` | no | yes | yes | yes |
| `/api/v1/boss/**` | no | no | yes | yes |
| `/api/v1/admin/**` | no | no | no | yes |
| `/api/v1/attendance/summary` | no | no | yes | yes |
| `/api/v1/projects` | no | yes | yes | yes |
| `/api/v1/contracts/**` | no | no | yes | admin 可选 |
| `/api/v1/income-settlements/**` | no | no | yes | admin 可选 |
| `/api/v1/reimbursements/**` | yes | yes | yes | admin 可选 |
| `/api/v1/reimbursement/**` | no | no | yes | admin 可选 |
| `/api/v1/reports/**` | yes | yes | yes | admin 可选 |
| `/api/v1/files` | yes | yes | yes | yes |

特别要求：

- 非 admin 访问 `/api/v1/admin/**` 必须返回 403。
- worker 不能查询或操作其他 worker 的数据。
- boss/admin 可以查看全量考勤、项目成本、人员明细。
- foreman 只能查看和处理自己负责项目或班组内的数据。
- 后端不能信任前端传入的 `role`、`workerId`、`userId` 来判断身份，必须从 token 解析当前用户。

认证接口：

`POST /api/v1/auth/login`

请求：

```json
{
  "phone": "13800000001",
  "password": "123456"
}
```

响应：

```json
{
  "accessToken": "access-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": 1,
    "phone": "13800000001",
    "name": "张三",
    "role": "worker",
    "avatar": "https://example.com/avatar.png"
  }
}
```

`POST /api/v1/auth/refresh`

请求：

```json
{
  "refreshToken": "refresh-token"
}
```

响应：

```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

Token 刷新要求：

- refresh 成功后旧 refreshToken 应失效。
- refreshToken 过期或无效返回 401。
- 并发刷新时保证不会签发混乱的 token 状态。

#### 3. 工人今日打卡状态 - P0

接口：`GET /api/v1/worker/today-status`

用途：工人首页加载时读取当前登录工人的今日打卡状态。

权限：

- worker：只能读取自己的今日状态。
- admin：可以读取，可选支持 `workerId` 查询。

请求参数：

- worker 正常调用不需要传 `workerId`。
- 后端必须从 token 识别当前登录工人。

成功响应：

```json
{
  "project": {
    "id": 1,
    "name": "绿地中心二期项目部"
  },
  "worker": {
    "id": 1,
    "name": "张三",
    "role": "木工"
  },
  "inRange": true,
  "distanceMeters": 28,
  "nextPunchType": "in",
  "records": [
    {
      "id": 101,
      "type": "in",
      "time": "07:52",
      "status": "present",
      "photoUrl": "https://oss.example.com/punch/101.jpg"
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| project.id | number | yes | 当前工人所属项目 ID |
| project.name | string | yes | 当前工人所属项目名称 |
| worker.id | number | yes | 当前登录工人 ID |
| worker.name | string | yes | 工人姓名 |
| worker.role | string | yes | 工种或岗位 |
| inRange | boolean | yes | 当前默认状态是否在范围内。若无实时坐标，可返回 true 或 null，但前端打卡时仍会传坐标 |
| distanceMeters | number | no | 距工地中心距离，单位米 |
| nextPunchType | `in`/`out`/null | yes | 下一步可打卡类型 |
| records | array | yes | 今日已有打卡记录 |

`nextPunchType` 计算规则：

- 今日无上班打卡：`in`。
- 已有上班打卡但无下班打卡：`out`。
- 上班和下班都已完成：`null`。

异常情况：

| 场景 | code | 说明 |
| --- | --- | --- |
| 当前用户不是 worker/admin | 403 | 无权限 |
| 工人未绑定项目 | 400 或 404 | message 说明“当前工人未绑定项目” |
| token 无效 | 401 | 登录已失效 |

#### 4. 工人打卡提交 - P0

接口：`POST /api/v1/worker/punch`

用途：工人提交上班或下班打卡。

推荐请求体：

```json
{
  "type": "in",
  "latitude": 31.2304,
  "longitude": 121.4737,
  "photoUrl": "https://oss.example.com/punch/2026/04/21/abc.jpg"
}
```

兼容要求：

- 如果当前后端已实现 `lat`/`lng`，短期内请同时兼容：
  - `latitude` 和 `longitude`
  - `lat` 和 `lng`
- 最终统一到 `latitude`/`longitude`。

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| type | `in`/`out` | yes | 上班或下班打卡 |
| latitude | number | yes | 纬度 |
| longitude | number | yes | 经度 |
| photoUrl | string | no | 打卡照片 URL，来自上传接口 |

成功响应：

```json
{
  "id": 123,
  "type": "in",
  "time": "07:52",
  "status": "present",
  "projectId": 1,
  "photoUrl": "https://oss.example.com/punch/2026/04/21/abc.jpg"
}
```

后端业务规则：

- 当前用户必须是 worker 或 admin。
- 后端从 token 识别当前工人，不允许前端传 workerId 替代身份。
- 工人必须绑定项目。
- 坐标必须合法：纬度 -90 到 90，经度 -180 到 180。
- 后端根据项目配置判断是否在允许打卡范围内。
- 同一天同一项目不能重复上班打卡。
- 未完成上班打卡时，不能直接下班打卡，除非后端业务允许生成异常记录。
- 下班打卡成功后更新同一条考勤记录的 `clock_out`。
- 若打卡异常，需要写入考勤异常表，供班组长处理。

错误响应建议：

| 场景 | code | message |
| --- | --- | --- |
| 缺少 type/latitude/longitude | 400 | 请求参数错误 |
| 坐标非法 | 400 | 坐标格式错误 |
| 超出打卡范围 | 403 | 超出打卡范围 |
| 重复上班打卡 | 409 | 今日已完成上班打卡 |
| 重复下班打卡 | 409 | 今日已完成下班打卡 |
| 未上班先下班 | 409 | 请先完成上班打卡 |
| 工人未绑定项目 | 404 | 当前工人未绑定项目 |

#### 5. 文件上传服务 - P1

接口：`POST /api/v1/files`

用途：统一处理打卡照片、报销凭证、日报图片、收入结算附件上传。

请求类型：`multipart/form-data`

字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| file | File | yes | 文件二进制 |
| bizType | string | yes | `punch`、`reimbursement`、`daily-report`、`settlement` |

成功响应：

```json
{
  "id": "file_001",
  "url": "https://oss.example.com/reimbursement/2026/04/xxx.jpg",
  "name": "receipt.jpg",
  "size": 123456,
  "contentType": "image/jpeg"
}
```

文件限制：

| bizType | 允许格式 | 最大大小 |
| --- | --- | --- |
| punch | jpg, jpeg, png | 5MB |
| reimbursement | jpg, jpeg, png, pdf | 10MB |
| daily-report | jpg, jpeg, png | 10MB |
| settlement | jpg, jpeg, png, pdf | 20MB |

安全要求：

- 校验真实 MIME 类型，不能只看扩展名。
- 文件名需要后端重新生成，避免覆盖和路径穿越。
- 返回 URL 应该是前端可访问的公网或内网静态资源地址。
- 上传失败返回 400 或 500，并给出明确 message。

#### 6. 报销提交与审批 - P1

接口：`POST /api/v1/reimbursements`

权限：

- worker、foreman、boss 可提交。
- 后端从 token 识别申请人。

请求：

```json
{
  "projectId": 1,
  "type": "材料费",
  "amount": 1500,
  "reason": "购买五金件",
  "images": [
    "https://oss.example.com/receipt/1.jpg"
  ]
}
```

重要要求：

- `images` 只能接收真实 URL，不能接收 `blob:` 开头的本地地址。
- 如果收到 `blob:`，返回 422。
- `amount` 必须大于 0。
- `reason` 不能为空。
- `projectId` 如果传入，必须校验用户是否有该项目权限。

成功响应返回创建后的实体：

```json
{
  "id": 101,
  "applicant": "张三",
  "applicantId": 1,
  "projectId": 1,
  "projectName": "绿地中心二期项目部",
  "type": "材料费",
  "amount": 1500,
  "reason": "购买五金件",
  "images": [
    "https://oss.example.com/receipt/1.jpg"
  ],
  "status": "pending",
  "createdAt": "2026-04-21 10:20:00"
}
```

接口：`GET /api/v1/reimbursements/history`

权限：

- worker/foreman 只看自己提交的记录。
- boss 可看全部或自己权限项目下的记录。

响应：

```json
{
  "summary": {
    "pendingAmount": 120.5,
    "reimbursedAmount": 560
  },
  "history": [
    {
      "id": 1,
      "applicant": "张三",
      "date": "2026-04-21",
      "type": "材料费",
      "amount": 150,
      "reason": "购买工具",
      "status": "pending"
    }
  ]
}
```

接口：`GET /api/v1/reimbursements/pending`

权限：boss。

用途：老板审批页读取待审批列表。

接口：`PUT /api/v1/reimbursements/{id}/approve`

权限：boss。

请求：

```json
{
  "approved": false,
  "reason": "票据不清晰"
}
```

规则：

- `approved=true` 时状态改为 `approved`。
- `approved=false` 时状态改为 `rejected`，`reason` 必填。
- 已审批记录重复审批返回 409。
- 成功后返回更新后的报销实体。

#### 7. 日报提交与模板 - P1

接口：`GET /api/v1/reports/templates`

权限：worker、foreman、boss。

接口：`POST /api/v1/reports/templates`

权限：foreman、boss。

请求：

```json
{
  "name": "通用施工日报",
  "content": "1. 今日完成工作\n2. 明日计划"
}
```

接口：`PUT /api/v1/reports/templates/{id}`

权限：foreman、boss。

接口：`POST /api/v1/reports`

权限：worker、foreman、boss。

请求：

```json
{
  "templateId": 1,
  "projectId": 1,
  "content": "今日完成 2 号楼模板安装。",
  "images": [
    "https://oss.example.com/report/1.jpg"
  ]
}
```

重要要求：

- `images` 必须是上传接口返回的真实 URL。
- 收到 `blob:` URL 返回 422。
- `content` 不能为空。
- `projectId` 必须校验当前用户是否有项目权限。

成功响应：

```json
{
  "id": 201,
  "date": "2026-04-21",
  "summary": "今日完成 2 号楼模板安装。",
  "status": "submitted",
  "reviewer": null,
  "projectId": 1,
  "projectName": "绿地中心二期项目部",
  "images": [
    "https://oss.example.com/report/1.jpg"
  ]
}
```

接口：`GET /api/v1/reports/history`

权限：

- worker/foreman 看自己提交或自己负责项目内的日报。
- boss 看全部或权限范围内日报。

#### 8. 现场状态 - P1

接口：`GET /api/v1/foreman/site-status`

权限：foreman、admin，boss 可选。

用途：班组长查看今日现场状态。

响应：

```json
{
  "projectName": "绿地中心二期项目部",
  "totalWorkers": 12,
  "checkedIn": 10,
  "missing": 2,
  "photos": [
    {
      "id": 1,
      "name": "张三",
      "time": "07:50",
      "pic": "https://oss.example.com/punch/1.jpg"
    }
  ]
}
```

要求：

- 当前排查中该接口曾出现 500，需要后端补齐。
- foreman 只返回自己负责项目或班组数据。
- `photos` 只返回今日打卡照片。
- 若无项目，返回空统计或 404，不应返回 500。

#### 8.1 班组月考勤日历 - P1

接口：`GET /api/v1/foreman/attendance/monthly?month=YYYY-MM`

权限：foreman、admin，boss 可选。

用途：班组长在移动端底部“考勤”页查看班组月度签到状态，和工人端“我的考勤”类似。

建议响应格式：

```json
{
  "2026-04-21": {
    "status": "missing",
    "in": "07:50",
    "out": null,
    "pic": "https://oss.example.com/punch/team-20260421.jpg",
    "reason": "2 人未完成签退"
  }
}
```

可选响应格式：

```json
{
  "records": [
    {
      "date": "2026-04-21",
      "status": "missing",
      "checkInTime": "07:50",
      "checkOutTime": null,
      "photoUrl": "https://oss.example.com/punch/team-20260421.jpg",
      "reason": "2 人未完成签退"
    }
  ]
}
```

要求：

- `status` 建议复用考勤枚举：`present`、`absent`、`late`、`early_leave`、`missing_in`、`missing_out`，或返回前端已兼容的 `normal`、`missing`。
- `in/out` 或 `checkInTime/checkOutTime` 返回 `HH:mm` 字符串；缺卡返回 `null`。
- 当前前端已兼容 map、array、`{ records: [] }` 三种结构。
- 2026-04-21 前端联调发现真实后端 `GET /api/v1/foreman/attendance/monthly?month=2026-04` 返回 500。前端目前会降级读取 `/api/v1/foreman/exceptions` 生成缺卡日期，但完整月历仍需要该接口返回真实月考勤数据。

#### 9. 老板考勤总览 - P2

接口：`GET /api/v1/attendance/summary`

权限：boss、admin。

响应：

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
    {
      "id": 1,
      "name": "绿地中心二期项目部",
      "total": 120,
      "present": 115,
      "absent": 5,
      "overtime": 45,
      "status": "施工中"
    }
  ],
  "dailyTrend": [
    {
      "date": "2026-04-21",
      "count": 438,
      "label": "4/21 周二"
    }
  ]
}
```

要求：

- 统计口径要和项目详情、人员详情一致。
- 数字字段返回 number，不返回 `"45,200"`、`"45.2M"` 这类展示字符串。
- 无数据时返回空数组和 0，不返回 500。

#### 10. 老板人员考勤详情 - P2

接口：`GET /api/v1/boss/employees`

权限：boss、admin。

用途：今日员工出勤列表。

响应：

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
  }
]
```

接口：`GET /api/v1/boss/employee-detail?id={id}`

权限：boss、admin。

响应：

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
    {
      "id": 1,
      "date": "2026-04-01",
      "status": "present",
      "time": "07:52",
      "overtime": 2
    }
  ]
}
```

接口：`GET /api/v1/boss/project-attendance-detail?name={projectName}`

权限：boss、admin。

响应：

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
    {
      "id": 1,
      "name": "张三",
      "role": "木工班组",
      "presentDays": 22,
      "overtimeHours": 15
    }
  ],
  "dailyRecords": [
    {
      "id": 1,
      "date": "2026-04-01",
      "present": 118,
      "absent": 2,
      "overtime": 35
    }
  ]
}
```

接口：`GET /api/v1/workers/{id}/attendance`

权限：boss、admin。

要求：

- worker 不能通过该接口查询他人考勤。
- 不存在的 worker 返回 404。
- 普通无数据返回空数组，不返回 500。

#### 11. 合同与收入结算 - P2

合同接口：

- `GET /api/v1/contracts`
- `POST /api/v1/contracts`
- `PUT /api/v1/contracts/{id}`
- `DELETE /api/v1/contracts/{id}`

权限：boss，admin 可选。

要求：

- POST/PUT 成功后返回创建或更新后的合同实体。
- DELETE 成功后返回 `{ "deleted": true, "id": "..." }`。
- 后端生成或校验最终合同 ID，前端不应依赖 `Date.now()` 作为最终 ID。
- 删除不存在合同返回 404。
- 删除已有结算或关联业务的合同，返回 409。

收入结算接口：

- `GET /api/v1/income-settlements`
- `POST /api/v1/income-settlements`
- `PUT /api/v1/income-settlements/{id}`
- `DELETE /api/v1/income-settlements/{id}`

权限：boss，admin 可选。

要求：

- POST/PUT 成功后返回创建或更新后的结算实体。
- `amount`、`taxRate`、`totalAmount` 都返回 number。
- `totalAmount` 建议由后端根据 `amount` 和 `taxRate` 计算，避免前端和后端口径不一致。
- 附件必须是上传接口返回的真实 URL 或文件 ID。

#### 12. 管理员项目管理 - P2

接口：

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `PUT /api/v1/projects/{id}`
- `DELETE /api/v1/projects/{id}`

权限：

- GET：boss、admin 可访问。
- POST/PUT/DELETE：admin。

要求：

- 项目 ID 统一 number，由后端生成。
- POST 请求不要求前端传 `id`。
- POST/PUT 成功后返回项目实体。
- DELETE 成功后返回 `{ "deleted": true, "id": 1 }`。
- 如果项目已有考勤、合同、报销、日报等关联数据，不允许直接删除，返回 409 并说明原因。

项目实体建议：

```json
{
  "id": 1,
  "name": "绿地中心二期项目部",
  "manager": "张经理",
  "startDate": "2026-01-15",
  "status": "施工中",
  "progress": 65,
  "budget": 15000000
}
```

#### 13. 项目成本 - P2

接口：`GET /api/v1/boss/project-cost?projectId={projectId}`

权限：boss、admin。

响应：

```json
{
  "attendance": [
    {
      "workerId": 1,
      "date": "2026-04-01",
      "dayShift": 1,
      "overtimeHours": 2
    }
  ],
  "reimbursements": [
    {
      "id": 1,
      "amount": 2500,
      "description": "木材采购",
      "date": "2026-04-05"
    }
  ],
  "workers": [
    {
      "id": 1,
      "name": "张三",
      "role": "木工",
      "avatar": "张",
      "dailyWage": 350
    }
  ]
}
```

要求：

- 不建议返回以 projectId 为 key 的对象，推荐直接返回当前项目的数据对象。
- 若为兼容当前前端，可短期保留旧结构，但需要约定最终结构。
- 无数据返回空数组。
- 工资成本计算口径需要后端明确：日薪、半天、加班小时倍率。

#### 14. 管理员员工管理 - P1

接口：

- `GET /api/v1/admin/workers`
- `POST /api/v1/admin/workers`
- `PUT /api/v1/admin/workers/{id}`
- `DELETE /api/v1/admin/workers/{id}`

权限：**仅 admin**。非 admin 访问返回 403。

`GET /api/v1/admin/workers`

用途：管理员员工列表页，返回所有员工完整信息。

响应：

```json
[
  {
    "id": 1,
    "name": "张三",
    "phone": "13800001001",
    "role": "木工",
    "team": "木工班组",
    "dailyWage": 350,
    "avatar": "张",
    "status": "active"
  }
]
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | yes | 员工 ID，后端生成 |
| name | string | yes | 姓名 |
| phone | string | no | 手机号 |
| role | string | yes | 工种：木工、钢筋工、泥瓦工、水电工、普工、焊工、架子工、油漆工、装修工、其他 |
| team | string | no | 班组 |
| dailyWage | number | no | 日薪，单位元 |
| avatar | string | no | 头像，通常是姓名首字 |
| status | `active`/`inactive` | yes | 在职/离职 |

`POST /api/v1/admin/workers`

用途：添加新员工。

请求：

```json
{
  "name": "张三",
  "phone": "13800001001",
  "role": "木工",
  "team": "木工班组",
  "dailyWage": 350,
  "avatar": "张",
  "status": "active"
}
```

校验规则：

- `name` 必填。
- `phone` 选填，若填写需符合手机号格式。
- `dailyWage` 选填，若填写必须 >= 0。
- `id` 由后端生成，前端不传。
- `status` 默认 `active`。

成功响应返回创建后的员工实体（含后端生成的 `id`）：

```json
{
  "id": 9,
  "name": "张三",
  "phone": "13800001001",
  "role": "木工",
  "team": "木工班组",
  "dailyWage": 350,
  "avatar": "张",
  "status": "active"
}
```

错误响应：

| 场景 | code | message |
| --- | --- | --- |
| name 为空 | 400 | 员工姓名不能为空 |
| dailyWage 为负数 | 400 | 日薪不能为负数 |
| 手机号格式错误 | 400 | 手机号格式不正确 |
| 非管理员 | 403 | 无权限 |

`PUT /api/v1/admin/workers/{id}`

用途：编辑已有员工信息。

请求：同 POST，所有字段均可选更新。

成功响应返回更新后的员工实体。

错误响应：

| 场景 | code | message |
| --- | --- | --- |
| 员工不存在 | 404 | 员工不存在 |
| dailyWage 为负数 | 400 | 日薪不能为负数 |
| 手机号格式错误 | 400 | 手机号格式不正确 |
| 非管理员 | 403 | 无权限 |

`DELETE /api/v1/admin/workers/{id}`

用途：删除员工。

成功响应：

```json
{
  "deleted": true,
  "id": 1
}
```

错误响应：

| 场景 | code | message |
| --- | --- | --- |
| 员工不存在 | 404 | 员工不存在 |
| 员工有关联考勤记录 | 409 | 该员工存在关联考勤记录，无法删除 |
| 非管理员 | 403 | 无权限 |

要求：

- POST/PUT 成功后必须返回完整员工实体（含所有字段）。
- DELETE 成功后返回 `{ deleted: true, id }`。
- 员工已关联考勤、合同、报销等业务数据时，删除应返回 409，避免级联数据丢失。
- 如果业务允许"软删除"，可将 status 改为 `inactive` 而非物理删除。

#### 16. 后端数据表和索引建议

核心表：

- `user`
- `project`
- `project_worker`
- `attendance_record`
- `attendance_exception`
- `reimbursement`
- `daily_report`
- `daily_report_template`
- `contract`
- `income_settlement`
- `file_asset`
- `refresh_token` 或 Redis token 存储

关键唯一约束：

- `user.phone` 唯一。
- `project_worker(project_id, worker_id)` 唯一。
- `attendance_record(worker_id, project_id, date)` 唯一。

建议索引：

```sql
CREATE INDEX idx_attendance_worker_date ON attendance_record(worker_id, date);
CREATE INDEX idx_attendance_project_date ON attendance_record(project_id, date);
CREATE INDEX idx_attendance_date ON attendance_record(date);
CREATE INDEX idx_exception_status ON attendance_exception(status);
CREATE INDEX idx_exception_project ON attendance_exception(project_id);
CREATE INDEX idx_reimbursement_status ON reimbursement(status);
CREATE INDEX idx_reimbursement_applicant ON reimbursement(applicant_id);
CREATE INDEX idx_reimbursement_project ON reimbursement(project_id);
CREATE INDEX idx_report_author_date ON daily_report(author_id, report_date);
CREATE INDEX idx_report_project ON daily_report(project_id);
```

#### 17. 后端交付验收标准

基础验收：

- 前端关闭 Mock 后，4 个测试账号可以登录并进入正确角色页面。
- 访问业务接口必须携带 token；未登录返回 401。
- 非 admin 请求 admin 接口返回 403。
- worker 不能查询其他 worker 的数据。

工人打卡验收：

- worker 可以完成今日上班打卡。
- worker 可以完成今日下班打卡。
- 刷新页面后今日打卡状态仍然存在。
- 重复上班或重复下班返回 409。
- 坐标非法返回 400。
- 超出范围返回 403。

文件和表单验收：

- 报销提交前图片已上传为真实 URL。
- 日报提交前图片已上传为真实 URL。
- 后端拒绝 `blob:` URL。
- 上传超大文件返回明确错误。

老板端验收：

- `GET /api/v1/attendance/summary` 不再返回 500。
- 老板端人员列表、人员详情、项目考勤详情、项目成本都能正常返回。
- 无数据时返回空数组或 0，不返回 500。

写接口验收：

- 所有 POST/PUT 成功后返回创建或更新后的业务实体。
- 所有 DELETE 成功后返回删除结果。
- 删除有关联数据的项目、合同等返回 409。

回归验证建议：

- 后端使用 Postman/Apifox 覆盖上述接口。
- 前端设置 `VITE_MOCK_ENABLED=false` 后运行：
  - `npm run lint`
  - `npm run test`
  - `npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1`

管理员员工验收：

- admin 可以查看完整员工列表。
- admin 可以添加新员工，返回含 id 的完整实体。
- admin 可以编辑员工信息，返回更新后的完整实体。
- admin 可以删除员工，返回 `{ deleted: true, id }`。
- 删除有关联考勤的员工返回 409。
- 非 admin 访问 `/api/v1/admin/workers/**` 返回 403。

#### 15. 管理员系统设置 - P1

接口：

- `GET /api/v1/admin/settings`
- `PUT /api/v1/admin/settings`

权限要求：仅 admin 角色可访问。非 admin 访问返回 403。

##### GET /api/v1/admin/settings — 获取系统设置

系统设置为单例数据（全局只有一条记录）。首次访问时后端应自动创建默认记录。

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clockIn": "08:00",
    "clockOut": "18:00",
    "lateGrace": 15,
    "overtimeStart": 1,
    "hourMode": "standard",
    "budgetUnit": "万元",
    "defaultStatus": "未开工",
    "progressAlert": 30,
    "projectPrefix": "P",
    "notifications": {
      "exception": true,
      "weekly": true,
      "delay": true,
      "daily": false
    }
  }
}
```

##### PUT /api/v1/admin/settings — 更新系统设置

请求体为完整的 settings 对象（全量覆盖，不需要传 ID）。

请求：

```json
{
  "clockIn": "09:00",
  "clockOut": "18:00",
  "lateGrace": 15,
  "overtimeStart": 1,
  "hourMode": "standard",
  "budgetUnit": "万元",
  "defaultStatus": "未开工",
  "progressAlert": 30,
  "projectPrefix": "P",
  "notifications": {
    "exception": true,
    "weekly": true,
    "delay": true,
    "daily": false
  }
}
```

响应：更新后的完整 settings 对象（同 GET 响应格式）。

##### 数据模型

| 字段 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| clockIn | string | 是 | 上班时间（HH:mm 格式） | "08:00" |
| clockOut | string | 是 | 下班时间（HH:mm 格式） | "18:00" |
| lateGrace | number | 是 | 迟到宽限分钟数（≥0） | 15 |
| overtimeStart | number | 是 | 加班起算小时数（≥0） | 1 |
| hourMode | string | 是 | 工时模式："standard" / "flexible" | "standard" |
| budgetUnit | string | 是 | 预算单位："万元" / "元" | "万元" |
| defaultStatus | string | 是 | 新建项目默认状态："未开工" / "施工中" | "未开工" |
| progressAlert | number | 是 | 进度提醒阈值 0-100 | 30 |
| projectPrefix | string | 是 | 项目编号前缀 | "P" |
| notifications.exception | boolean | 是 | 考勤异常提醒开关 | true |
| notifications.weekly | boolean | 是 | 项目进度周报开关 | true |
| notifications.delay | boolean | 是 | 项目延期预警开关 | true |
| notifications.daily | boolean | 是 | 每日考勤汇总开关 | false |

##### 后端实现建议

- 系统设置是单例数据（只有一条记录），可以用单行表存储，也可以用 key-value 表存储。
- PUT 为全量覆盖，前端每次提交所有字段。
- 建议增加 `updatedAt`（时间戳）和 `updatedBy`（操作人 ID）字段记录修改信息。
- 首次 GET 时如果不存在应自动创建并返回默认值。

##### 错误码

| HTTP 状态 | code | 说明 |
|-----------|------|------|
| 401 | 401 | 未登录 |
| 403 | 403 | 非 admin 角色 |
| 400 | 400 | 参数校验失败（如 clockIn 格式不对） |

##### 验收标准

- admin 调用 GET 返回完整设置对象。
- admin 调用 PUT 后再 GET 能看到更新后的值。
- 非 admin 访问返回 403。
- 首次 GET（无数据时）返回默认值。

#### 18. 后端接口完整清单（按模块）

> 以下为前端 Mock 覆盖的全部端点。标注 `✅` 表示真实后端联调已通过，`❌` 表示尚未实现或返回 500，`⚠️` 表示部分通过。后端请逐条补齐。

##### 认证 (Auth)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 1 | POST | `/api/v1/auth/login` | P0 | ✅ | 手机号+密码登录，返回 accessToken/refreshToken/user |
| 2 | POST | `/api/v1/auth/refresh` | P0 | ✅ | 刷新 token，旧 refreshToken 失效 |

##### 工人端 (Worker)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 3 | GET | `/api/v1/worker/today-status` | P0 | ✅ | 工人今日打卡状态（项目、范围、下一步打卡类型、已有记录） |
| 4 | GET | `/api/v1/worker/attendance/monthly?month=YYYY-MM` | P0 | ✅ | 工人月度考勤日历 |
| 5 | POST | `/api/v1/worker/punch` | P0 | ✅ | 工人打卡（签到/签退），校验坐标和打卡顺序 |
| 6 | GET | `/api/v1/worker/stats` | P2 | ⚠️ | 工人统计数据 |

##### 班组长端 (Foreman)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 7 | GET | `/api/v1/foreman/projects` | P0 | ✅ | 班组长分配的项目列表 |
| 8 | GET | `/api/v1/foreman/workers` | P0 | ✅ | 班组下的工人列表 |
| 9 | GET | `/api/v1/foreman/site-status` | P1 | ✅ | 工地现场状态（出勤/缺勤人数、现场照片） |
| 10 | GET | `/api/v1/foreman/attendance/today?projectId=` | P1 | ⚠️ | 当日考勤详情（按项目），真实后端曾返回 500 |
| 11 | GET | `/api/v1/foreman/attendance/monthly?month=YYYY-MM` | P1 | ✅ | 班组长月度考勤日历 |
| 12 | POST | `/api/v1/foreman/attendance/` | P1 | ⚠️ | 批量提交工人考勤记录 |
| 13 | GET | `/api/v1/foreman/exceptions` | P1 | ✅ | 异常记录列表 |
| 14 | POST | `/api/v1/foreman/exceptions/{id}/process` | P1 | ✅ | 处理异常（通过） |
| 15 | POST | `/api/v1/foreman/exceptions/{id}/reject` | P1 | ✅ | 拒绝异常 |

##### 老板端 (Boss)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 16 | GET | `/api/v1/dashboard/boss` | P1 | ✅ | 老板首页仪表盘数据 |
| 17 | GET | `/api/v1/boss/employees` | P2 | ✅ | 今日员工出勤列表 |
| 18 | GET | `/api/v1/boss/project-attendance-detail?name=` | P2 | ✅ | 项目考勤详情（含每日记录和工人汇总） |
| 19 | GET | `/api/v1/boss/project-cost` | P2 | ✅ | 项目费用数据 |
| 20 | GET | `/api/v1/boss/employee-detail?id=` | P2 | ✅ | 单个员工考勤明细 |

##### 考勤查询

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 21 | GET | `/api/v1/attendance/summary` | P2 | ✅ | 考勤汇总（含项目列表和日趋势） |
| 22 | GET | `/api/v1/projects/{id}/attendance` | P2 | ✅ | 项目考勤详情 |
| 23 | GET | `/api/v1/workers/{id}/attendance` | P2 | ✅ | 工人考勤记录 |
| 24 | GET | `/api/v1/employees/{id}/attendance` | P2 | ✅ | 员工考勤记录 |

##### 报销 (Reimbursement)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 25 | GET | `/api/v1/reimbursements/pending` | P1 | ✅ | 待审批报销列表 |
| 26 | GET | `/api/v1/reimbursements/history` | P1 | ✅ | 报销历史 |
| 27 | POST | `/api/v1/reimbursements` | P1 | ✅ | 创建报销申请 |
| 28 | PUT | `/api/v1/reimbursements/{id}/approve` | P1 | ✅ | 审批/拒绝报销 |
| 29 | GET | `/api/v1/reimbursement/overview` | P2 | ✅ | 报销概览/汇总 |
| 30 | GET | `/api/v1/reimbursement/project-detail?projectName=` | P2 | ✅ | 项目报销明细 |

##### 日报 (Daily Report)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 31 | GET | `/api/v1/reports/templates` | P1 | ✅ | 日报模板列表（系统+个人，按 owner 过滤） |
| 32 | POST | `/api/v1/reports/templates` | P1 | ✅ | 创建个人模板 |
| 33 | PUT | `/api/v1/reports/templates/{id}` | P1 | ✅ | 更新个人模板（仅 owner） |
| 34 | DELETE | `/api/v1/reports/templates/{id}` | P1 | ✅ | 删除个人模板（仅 owner） |
| 35 | GET | `/api/v1/reports/history` | P1 | ✅ | 日报提交历史 |
| 36 | POST | `/api/v1/reports` | P1 | ✅ | 提交日报 |
| 37 | PUT | `/api/v1/reports/{id}/review` | P1 | ✅ | 老板审阅日报 |

##### 待办 (Todos)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 38 | GET | `/api/v1/todos/summary` | P2 | ✅ | 待办汇总（按类型计数） |
| 39 | GET | `/api/v1/todos?status=pending&type=` | P2 | ✅ | 待办列表（按角色和类型动态生成） |

##### 项目管理 (Projects)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 40 | GET | `/api/v1/projects` | P1 | ✅ | 项目列表 |
| 41 | POST | `/api/v1/projects` | P2 | ✅ | 创建项目 |
| 42 | PUT | `/api/v1/projects/{id}` | P2 | ✅ | 更新项目 |
| 43 | DELETE | `/api/v1/projects/{id}` | P2 | ✅ | 删除项目 |

##### 合同管理 (Contracts)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 44 | GET | `/api/v1/contracts` | P2 | ✅ | 合同列表（收入+支出） |
| 45 | POST | `/api/v1/contracts` | P2 | ✅ | 创建合同 |
| 46 | PUT | `/api/v1/contracts/{id}` | P2 | ✅ | 更新合同 |
| 47 | DELETE | `/api/v1/contracts/{id}` | P2 | ✅ | 删除合同 |

##### 收入结算 (Income Settlements)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 48 | GET | `/api/v1/income-settlements` | P2 | ✅ | 结算列表 |
| 49 | POST | `/api/v1/income-settlements` | P2 | ✅ | 创建结算 |
| 50 | PUT | `/api/v1/income-settlements/{id}` | P2 | ✅ | 更新结算 |
| 51 | DELETE | `/api/v1/income-settlements/{id}` | P2 | ✅ | 删除结算 |

##### 管理员员工管理 (Admin Workers)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 52 | GET | `/api/v1/admin/workers` | P1 | ❌ | 员工列表（含 phone/role/team/dailyWage/status） |
| 53 | POST | `/api/v1/admin/workers` | P1 | ❌ | 添加员工 |
| 54 | PUT | `/api/v1/admin/workers/{id}` | P1 | ❌ | 编辑员工 |
| 55 | DELETE | `/api/v1/admin/workers/{id}` | P1 | ❌ | 删除员工 |

##### 文件上传

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 56 | POST | `/api/v1/files` | P1 | ✅ | 统一文件上传（multipart/form-data），支持 punch/reimbursement/daily-report/settlement |

##### 管理员系统设置 (Admin Settings)

| # | 方法 | 接口 | 优先级 | 状态 | 说明 |
|---|------|------|--------|------|------|
| 57 | GET | `/api/v1/admin/settings` | P1 | ❌ | 获取系统设置（单例） |
| 58 | PUT | `/api/v1/admin/settings` | P1 | ❌ | 更新系统设置（全量覆盖） |

**总计 58 个端点**，其中 ❌ 未实现的为 **Admin Workers CRUD**（#52-#55，4 个接口）和 **Admin Settings**（#57-#58，2 个接口）。其余接口真实后端联调已基本通过（部分 ⚠️ 项需后端确认稳定性）。

详细请求/响应格式见上方各节（第 1-15 节）。

## Change Log

### 2026-04-24 - 管理员系统设置持久化

- 前端管理员系统设置页面接入 API，替换纯本地 useState：
  - `src/pages/admin/Settings.tsx` 重写，页面加载时 GET 获取设置，保存时 PUT 全量提交。
  - 新增 loading 骨架屏和 saving 按钮禁用状态。
  - 通知设置新增"保存通知"按钮。
  - 数据管理区域四个按钮保持"功能开发中"不变。
- `src/lib/api.ts` 新增 2 个 Mock 端点：`GET/PUT /api/v1/admin/settings`，数据持久化到 localStorage key `mock-admin-settings`。
- `src/types/models.ts` 新增 `SystemSettings` 接口和 `DEFAULT_SETTINGS` 常量。
- 后端接口文档已补充（第 15 节）：2 个新端点 #57-#58，含完整字段说明、数据模型、验收标准。

### 2026-04-23 - 管理员员工管理 CRUD 与后端接口清单

- 前端新增管理员员工管理完整 CRUD：
  - `src/pages/admin/Employees.tsx` 重写，支持添加/编辑/删除员工，含搜索和分页。
  - `src/lib/api.ts` 新增 4 个 Mock 端点：`GET/POST/PUT/DELETE /api/v1/admin/workers`。
  - `src/types/models.ts` 扩展 `Worker` 接口，增加 `phone`/`team`/`status` 字段。
  - `public/mock/foreman-workers.json` 扩展为 8 名员工，包含完整字段。
- 后端接口文档已补充：
  - 新增第 14 节：管理员员工管理接口详细规格（请求/响应/校验规则/错误码）。
  - 新增第 18 节：全部 56 个端点的完整清单，标注优先级和联调状态。
  - 当前仅 Admin Workers CRUD（#52-#55）未实现，其余接口真实后端联调已通过。

### 2026-04-21 - 工头考勤日历与待办范围调整

- 工头底部导航新增“考勤”，路由为 `/foreman-attendance`。
- 新增 `src/pages/foreman/Attendance.tsx`，复用工人考勤日历的交互方式，支持月切换、状态圆点、单日详情和图片预览。
- 新增 `src/pages/foreman/attendanceMonthly.ts`，兼容后端返回 map、array、`{ records: [] }` 三种月考勤结构。
- 工头月考勤接口异常时，前端降级读取 `/api/v1/foreman/exceptions`，将异常日期标为缺卡，避免页面完全空白。
- 工作台待办调整为：
  - worker/foreman 仅展示“提交今日施工日报”和“签到提醒”。
  - 工头不再显示硬编码“审批张三的报销单 / 去审批”。
  - 工人签到提醒读取 `/api/v1/worker/today-status`，已完成上下班打卡时按钮灰色不可点。
  - 工头签到提醒读取 `/api/v1/foreman/site-status`，存在未打卡人数时点击进入 `/foreman-attendance`。
- 后端配合：
  - 完整班组考勤日历仍需要后端实现稳定的 `GET /api/v1/foreman/attendance/monthly?month=YYYY-MM`。
  - 2026-04-21 Playwright 真实后端验证发现该接口返回 500；前端已做降级，但只能展示异常处理数据，不能替代真实月考勤。

### 2026-04-22 - 真实后端复测结果

- 已重新验证真实联调环境：
  - `POST /api/v1/auth/login`：200
  - `GET /api/v1/foreman/site-status`：200
  - `GET /api/v1/foreman/attendance/monthly?month=2026-04`：200
- Playwright CLI 真实环境专项冒烟通过：
  - foreman 工作台仅保留“提交今日施工日报”和“提醒班组签到”。
  - 旧的“审批张三的报销单 / 去审批”已不再出现。
  - 签到提醒可进入“班组考勤”。
  - worker 首页和工作台加载正常。
  - 浏览器请求异常计数：`FOREMAN_BAD 0`，`WORKER_BAD 0`。

### 2026-04-22 - 真实环境 Playwright 主流程回归通过

- 更新 `e2e/main-flow.spec.ts`，让真实后端环境下的 E2E 用例更稳：
  - 给浏览器上下文补充地理定位权限和固定坐标，避免 worker 打卡因浏览器权限缺失而失败。
  - worker 用例兼容“上班打卡 / 下班打卡 / 今日已完成”三种状态，不再假设每次运行都是当天首次打卡。
  - worker 打卡结果断言兼容真实后端返回的 `正常 / 迟到 / 早退 / 缺卡` 等状态，不再把状态写死为“正常”。
  - foreman 用例兼容“暂无待处理异常”的持久化环境，不再假设永远存在待处理项。
- 验证：
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=120000`
  - 结果：5 个主流程用例全部通过。
  - `npm run lint`：通过。

### 2026-04-21 - 报销审批联动和用户名位置调整

- 报销审批：
  - `src/pages/shared/Reimbursement.tsx` 的“审批通过”按钮会调用 `PUT /api/v1/reimbursements/{id}/approve`；真实后端模式会联动后端，Mock 模式会更新内存状态。
  - 增加审批中的 loading 态、成功提示和失败提示。
  - 将按钮文案从“同意打款”调整为“审批通过”，避免把“审批通过”和“实际打款”混为一个动作。
- 用户名位置：
  - `src/components/MobileShell.tsx` 移除所有移动页面常驻的全局用户栏。
  - `src/pages/shared/Workbench.tsx` 在工作台头部增加账户区，展示用户名、角色端标签和退出按钮。
  - 设计取向：用户名/退出属于账户与工具集合信息，放在工作台更合适，业务页面顶部保留给当前业务内容。

### 2026-04-21 - 浏览器评审问题修复

- 修复移动端滚动条和底部大留白：
  - `src/index.css` 将 `html/body/#root` 固定为 100% 高度并隐藏文档级滚动，所有滚动条统一隐藏。
  - `src/components/MobileShell.tsx` 改为 `h-dvh` 内部滚动布局，底部导航参与布局而不是覆盖页面内容。
  - 移动端页面底部 padding 从 `pb-20` 缩到 `pb-4`，避免滚到页面底部时出现大块空白。
- 调整移动端顶部用户名展示：
  - `src/components/MobileShell.tsx` 从“头像首字 + 用户名”改为“用户图标 + 用户名 + 角色端标签”，减少“王 王老板”这类重复感。
- 修复报销状态裸枚举展示：
  - `src/pages/shared/Reimbursement.tsx` 将 `approved/pending/rejected/paid` 映射为“已通过/审批中/已驳回/已打款”，筛选也改用统一状态 key。

### 2026-04-21 - 前端主流程修复完成

- 修复角色权限：`src/components/AuthGuard.tsx` 支持 `allowedRoles`，`src/App.tsx` 将 `/admin/*` 限制为 admin，将移动端路由限制为 worker/foreman/boss，并让登录用户角色优先于 URL `?role=` 参数。
- 接入工人打卡：新增 `src/services/worker.ts`，`src/pages/worker/Home.tsx` 改为读取 `/worker/today-status`，打卡时提交 `/worker/punch`，并处理加载、异常、重复/完成状态。
- 修复文件上传链路：`src/lib/api.ts` 新增 `uploadFile`/`uploadFiles`，`src/pages/shared/Reimbursement.tsx` 和 `src/pages/shared/DailyReport.tsx` 改为提交前上传文件，业务 payload 只发送真实 URL，不发送 `blob:` 预览地址。
- 增强 Mock 写状态：`src/lib/api.ts` 为工人打卡、报销、日报、日报模板、异常处理、合同、收入结算、项目管理等关键写操作增加内存态响应，避免本地 Mock 下“成功但数据不变”。
- 优化页面体验：`src/pages/boss/Attendance.tsx` 增加“查看人员考勤明细”明确入口；`src/pages/shared/Workbench.tsx` 将排班/设置改为禁用态并显示“即将上线”；登录、报销、日报的部分图标按钮补充 `aria-label`。
- 更新 Playwright：`e2e/main-flow.spec.ts` 支持 `PLAYWRIGHT_BASE_URL`，新增 worker 越权访问 admin 和 `?role=boss` 不能切换身份的验证，并验证工作台未完成入口禁用。
- 后端实现计划已备份到 `C:\files\codes\attendance-codex\Attendance\docs\backend-frontend-adapter-plan-2026-04-21.md`，实施范围包括统一 401/403 JSON、工人打卡闭环、上传接口、写接口返回实体、权限范围校验、空数据稳定和数据库脚本更新。

### 2026-04-21

- 新建 `PROJECT_PLAN_AND_CHANGES.md`，作为后续计划、修改、验证和后端配合事项的统一记录文件。
- 写入“后端开发交付清单”，包含权限、打卡、上传、报销、日报、现场状态、老板端详情、合同结算、管理员项目管理、数据规范和验收标准。

### 2026-04-21 - 工人打卡与考勤详情联动修复

- 问题结论：
  - 当前 Mock 环境下，这不是后端问题，而是前端 Mock 数据源不一致：`/api/v1/worker/punch` 只更新了 `today-status` 内存状态，`/api/v1/worker/attendance/monthly` 仍然读取静态 JSON。
  - 真实后端环境下，需要后端保证打卡成功后写入考勤记录，随后 `GET /api/v1/worker/attendance/monthly` 或同类详情接口能立即读到最新记录。
- 修复内容：
  - `src/lib/api.ts` 新增 `mockWorkerMonthlyAttendance` 内存状态。
  - `POST /api/v1/worker/punch` 成功后同步更新当天月考勤记录。
  - `GET /api/v1/worker/attendance/monthly` 改为返回可变内存状态，避免首页打卡成功但考勤页仍显示旧静态数据。
  - 新增 `src/lib/api.test.ts` 回归测试，覆盖“打卡后月考勤出现当天上班记录”。
- 后端协作要求：
  - `POST /api/v1/worker/punch` 成功后必须持久化到同一张考勤记录或可聚合的数据源。
  - `GET /api/v1/worker/today-status` 和 `GET /api/v1/worker/attendance/monthly` 必须从同一真实数据源派生，不能各自维护互不相干的数据。

### 2026-04-21 - 待办事项真实功能建议

- 当前状态：
  - `src/pages/shared/Workbench.tsx` 的“待办事项”仍是前端硬编码和本地 `processed` 状态，只能改变按钮文案，不会和后端或业务状态联动。
- 建议后端新增通用待办接口：
  - `GET /api/v1/todos?status=pending`：返回当前登录用户可见待办。
  - `GET /api/v1/todos/summary`：返回待办总数和按类型聚合数量，可用于角标。
  - `POST /api/v1/todos/{id}/complete`：仅用于纯待办确认类任务。
  - 对于报销审批、异常处理、日报提交等业务任务，建议前端跳转到业务页面处理，后端根据业务状态自动完成待办，而不是只改待办状态。
- 待办实体建议：
```json
{
  "id": "todo_001",
  "type": "daily_report",
  "title": "提交今日施工日报",
  "description": "今天 18:00 前",
  "priority": "normal",
  "status": "pending",
  "deadline": "2026-04-21T18:00:00+08:00",
  "sourceId": 123,
  "actionUrl": "/daily-report",
  "createdAt": "2026-04-21T08:00:00+08:00"
}
```
- `type` 建议枚举：
  - `daily_report`：日报待提交。
  - `reimbursement_approval`：报销待审批。
  - `attendance_exception`：考勤异常待处理。
  - `missing_punch`：缺卡待补充说明。
  - `settlement_review`：结算待确认。
- 前端改造建议：
  - Workbench 启动时请求 `GET /api/v1/todos?status=pending`。
  - “去处理”按钮优先跳转 `actionUrl`；无 `actionUrl` 时打开待办详情弹窗。
  - 业务处理成功后刷新待办列表。
  - 底部工作台入口可接入 `GET /api/v1/todos/summary` 显示角标。
- 验收标准：
  - 工人当天未提交日报时，工作台出现日报待办；提交日报成功后待办自动消失。
  - 班组长存在待审批报销或考勤异常时，工作台出现对应待办；审批/处理完成后自动消失。
  - 刷新页面后待办状态不丢失。
  - 不同角色只能看到自己权限范围内的待办。

#### 2026-04-21 待办范围调整

根据当前产品反馈，worker 和 foreman 的工作台待办先收敛为两类：

- `daily_report`：今日施工日报未提交。
- `missing_punch` / `attendance_reminder`：签到或签退提醒。

前端当前实现没有接入 `/api/v1/todos`，而是直接从现有业务接口派生：

- worker：`/api/v1/reports/history` + `/api/v1/worker/today-status`。
- foreman：`/api/v1/reports/history` + `/api/v1/foreman/site-status`。

如果后续改回通用待办接口，后端需要支持按角色和待办类型过滤，至少允许前端请求：

- `GET /api/v1/todos?status=pending&type=daily_report,attendance_reminder`
- 或在返回实体中提供 `type` 字段，前端过滤掉 worker/foreman 不需要的报销审批、结算审批等类型。

## Verification

### 2026-04-21 - 日报待办完成态修复

- 问题：
  - 工作台日报待办点击后可以进入日报页，但日报提交完成后回到工作台，按钮仍显示“去处理”，还可以继续点击。
- 修复：
  - `src/pages/shared/workbenchTodos.ts` 新增 `hasSubmittedDailyReportToday()`，根据 `/api/v1/reports/history` 中的 `date` 判断今天是否已提交日报。
  - `src/pages/shared/Workbench.tsx` 进入工作台时请求 `GET /api/v1/reports/history`。
  - 如果今天已有日报记录，日报待办按钮显示“已完成”，灰色样式，并设置 `disabled`。
  - 如果今天没有日报记录，按钮仍显示“去处理”，点击进入 `/daily-report`。
- 验证：
  - `npx vitest run src/pages/shared/workbenchTodos.test.ts`：通过，4 个用例。
  - `npm run lint`：通过。
  - `npm run test`：通过，4 个测试文件 / 14 个用例。
  - Playwright 真实后端页面验证：当前 worker 账号今天已有日报记录，工作台按钮显示“已完成”、灰色、不可点击，`badCount=0`。

### 2026-04-21 - 工作台待办跳转与考勤状态规则修复

- 问题 1：工作台“去处理”只改变本地按钮状态，没有进入对应业务页面。
  - 修复：新增 `src/pages/shared/workbenchTodos.ts`，将待办动作映射到业务路由。
  - 当前规则：`report -> /daily-report`，`reimburse -> /reimbursement`。
  - `src/pages/shared/Workbench.tsx` 的待办按钮改为直接 `navigate()` 到对应页面。
- 问题 2：工人考勤日历仍直接使用后端返回的 `status`，没有根据实际打卡时间重新判断迟到/早退。
  - 修复：新增 `src/pages/worker/attendanceStatus.ts`。
  - 规则：
    - 上班签到时间 `>= 09:00`：迟到。
    - 下班签退时间 `< 16:00`：早退。
    - 缺少上班或下班打卡：缺卡。
    - 同时满足迟到和早退时显示 `迟到/早退`。
  - `src/pages/worker/Attendance.tsx` 的日历圆点和底部详情弹窗都改用该规则展示颜色和标签。
- 验证：
  - 新增单元测试：
    - `src/pages/shared/workbenchTodos.test.ts`
    - `src/pages/worker/attendanceStatus.test.ts`
  - `npx vitest run src/pages/shared/workbenchTodos.test.ts src/pages/worker/attendanceStatus.test.ts`：通过，7 个用例。
  - `npm run lint`：通过。
  - `npm run test`：通过，4 个测试文件 / 12 个用例。
  - Playwright 真实后端页面验证：
    - 点击工作台日报待办“去处理”后进入 `/daily-report`。
    - 2026-04-21 因签到时间晚于 09:00，日历圆点显示黄色，详情弹窗显示“迟到”。
    - API `badCount=0`。

### 2026-04-21 - 项目报销详情前端联调修复

- 问题：
  - 真实后端要求 `GET /api/v1/reimbursement/project-detail?projectName={projectName}`。
  - 前端 `src/pages/boss/ProjectReimbursementDetail.tsx` 原先请求 `GET /api/v1/reimbursement/project-detail`，未携带项目名，导致真实后端返回 400。
- 修复：
  - 从路由 `/boss/reimbursement-project/:projectName` 读取并解码 `projectName`。
  - 请求改为：`/api/v1/reimbursement/project-detail?projectName=${encodeURIComponent(decodedProjectName)}`。
- 验证：
  - `npm run lint`：通过。
  - `npm run test`：通过，2 个测试文件 / 5 个用例。
  - API 复测：`GET /reimbursement/project-detail?projectName=绿地中心二期项目部` 返回 200。
  - Playwright 真实后端页面验证：项目报销详情页渲染成功，`badCount=0`，不再出现 `400 /api/v1/reimbursement/project-detail`。

### 2026-04-21 - 真实后端 CLI 联调验证

- 环境：
  - `.env`：`VITE_MOCK_ENABLED=false`，`VITE_API_BASE_URL=/api/v1`。
  - 前端：`http://localhost:3000`。
  - 后端：`http://localhost:8080/api/v1`。
  - `agent-browser` CLI 当前未安装，使用 Node `fetch` + Playwright CLI 完成等价验证。
- 后端 API 验证结果：
  - 登录：worker、foreman、boss、admin 四个测试账号均登录成功，角色正确。
  - 权限：未登录访问 worker 今日状态返回 401；worker 访问 `/attendance/summary` 返回 403。
  - worker：`GET /worker/today-status`、`GET /worker/attendance/monthly?month=2026-04` 通过；当前账号今日已完成上下班打卡，所以写入打卡用例跳过。
  - 上传：`POST /files` 对 `reimbursement` 和 `daily-report` 均通过，返回非 `blob:` 的 `/uploads/...` 路径。
  - 报销：`POST /reimbursements` 返回实体 ID；`PUT /reimbursements/{id}/approve` 返回 `approved` 实体。
  - 日报：`POST /reports` 返回创建后的日报实体。
  - foreman：`/foreman/projects`、`/foreman/workers`、`/foreman/site-status`、`/foreman/exceptions` 均通过。
  - boss/admin：`/attendance/summary`、`/boss/employees`、`/boss/employee-detail`、`/workers/{id}/attendance`、`/boss/project-attendance-detail`、`/boss/project-cost`、`/reimbursement/overview`、`/contracts`、`/income-settlements`、`/projects` 均通过。
  - 使用后端当前参数 `GET /reimbursement/project-detail?projectName={projectName}` 时通过。
- 发现的问题：
  - 前端页面 `BossProjectReimbursementDetail` 当前实际请求的是 `GET /api/v1/reimbursement/project-detail`，未携带 `projectName`，真实后端返回 400。
  - Playwright 真实前端冒烟抓到 2 次 `400 /api/v1/reimbursement/project-detail`，均来自上述页面。
  - 处理建议：前端应把路由参数 `projectName` 传给接口：`/api/v1/reimbursement/project-detail?projectName=${encodeURIComponent(projectName)}`；或后端兼容无参请求，但更推荐前端传参。
- Playwright 真实后端主流程：
  - 旧 `e2e/main-flow.spec.ts` 在真实后端下 4/5 通过。
  - worker 用例失败原因是测试账号当天已完成上下班打卡，按钮为“今日已完成”，旧脚本仍等待“上班打卡”；这属于测试数据状态和脚本假设不一致，不是接口 500。
  - 稳健版浏览器冒烟通过核心页面加载，未发现 5xx；仅发现上述报销项目详情 400。

### 2026-04-21 - 工人打卡与考勤页联动验证

- TDD 回归测试：
  - 先运行 `npx vitest run src/lib/api.test.ts`，确认新增用例在修复前失败，失败原因是月考勤当天记录仍为 `undefined`。
  - 修复后再次运行 `npx vitest run src/lib/api.test.ts`，结果通过。
- 静态检查和单元测试：
  - `npm run lint`：通过。
  - `npm run test`：通过，2 个测试文件 / 5 个用例全部通过。
- Playwright CLI 专项验证：
  - 登录工人账号，首页点击上班打卡，进入 `/attendance`，打开 2026-04-21 当天详情。
  - 结果：详情不再显示旧静态 `07:51`，下班记录显示 `--:--`，说明首页打卡状态已经同步到月考勤详情。
  - 脚本输出：`PLAYWRIGHT_PUNCH_MONTHLY_OK`。
- Playwright 主流程验证：
  - `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000`
  - 结果：5 个用例全部通过。

### 2026-04-21 - 报销审批和用户名位置验证

- 专项 Playwright CLI 脚本通过：
  - 首页不再出现全局用户栏。
  - 工作台显示“王老板”和“老板端”的账户区。
  - 点击“审批通过”后出现“已审批通过，后端状态已更新”反馈，并且待审批列表状态发生变化。
  - 输出：`COMMENT_FIX_SMOKE_OK approval_state_updated account_info_workbench_only`。
- `npm run lint`：通过。
- `npm run test`：通过，1 个测试文件 / 4 个用例全部通过。
- 主流程 Playwright：
  - `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000`
  - 结果：5 个用例全部通过。

### 2026-04-21 - 浏览器评审问题 CLI 验证

- `npm run lint`：通过，`tsc --noEmit` 无错误。
- UI 专项 Playwright CLI 脚本通过：
  - 文档级滚动条宽度为 0，`html/body` overflow 为 hidden。
  - 顶部用户栏包含“王老板”和“老板端”，不再以“王 王老板”格式展示。
  - Boss 首页滚到底部后，最后内容与底部导航之间间距为 16px。
  - 报销记录正文不再出现 `approved/pending/rejected/paid` 裸枚举。
  - 输出：`UI_FIX_SMOKE_OK no_document_scrollbar username_format status_labels bottom_gap=16`。
- `npm run test`：通过，1 个测试文件 / 4 个用例全部通过。
- 主流程 Playwright：
  - `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000`
  - 结果：5 个用例全部通过。

### 2026-04-21 - 前端主流程修复验证

- `npm run lint`：通过，`tsc --noEmit` 无错误。
- `npm run test`：通过，1 个测试文件 / 4 个用例全部通过。
- 使用 Mock dev server 验证 Playwright：
  - 启动端口：`http://localhost:3001`
  - 命令：`PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000`
  - 结果：5 个 Playwright 主流程用例全部通过。
- 额外发现：当前 `.env` 为 `VITE_MOCK_ENABLED=false`，3000 端口连接真实后端时，后端若返回空的 worker 今日状态对象，前端不会再崩溃，但真实打卡闭环仍依赖后端按本文档实现完整字段。

### 2026-04-21 - CLI 专项测试新增功能

- `agent-browser` CLI 当前未安装，因此使用项目已有 Playwright CLI 执行浏览器自动化测试。
- 完整主流程命令：
  - `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/main-flow.spec.ts --browser=chromium --workers=1 --reporter=list --timeout=90000`
  - 结果：5 个 Playwright 用例全部通过。
- 新功能专项脚本通过：
  - worker 访问 `/admin` 会被重定向回 worker 页面。
  - worker 访问 `/?role=boss` 不会切换成 boss 页面。
  - worker 可完成上班打卡和下班打卡，完成后按钮进入“今日已完成”禁用态。
  - 报销上传图片后提交成功，说明业务 payload 未携带 `blob:` URL。
  - 日报上传图片后发送成功，说明业务 payload 未携带 `blob:` URL。
  - 脚本输出：`CLI_SMOKE_OK role_guard punch_flow reimbursement_upload daily_report_upload`。
- 代码质量验证：
  - `npm run lint`：通过。
  - `npm run test`：通过，1 个测试文件 / 4 个用例全部通过。

### 2026-04-21

- 文档类变更，未运行代码测试。
- 需要确认文件可正常 UTF-8 读取，并确认文档已包含后端可执行的开发清单。

## Open Issues

- 后端当前实际实现情况需要以后端仓库为准；本文件依据前端调用点、Mock 数据和现有 API 文档整理。
- `lat/lng` 与 `latitude/longitude` 参数需要后端确认最终标准。建议短期兼容，长期统一为 `latitude/longitude`。
- 项目成本接口当前前端可能兼容旧结构，建议后续前后端一起统一响应结构。

### 2026-04-21 - Backend todo endpoints delivered

- Implemented backend support for the new Workbench todo proposal:
  - `GET /api/v1/todos?status=pending`
  - `GET /api/v1/todos/summary`
  - `POST /api/v1/todos/{id}/complete`
- Todo data is derived from existing business tables, so no database table change is required in this pass.
- Derived todo sources:
  - `daily_report`: current worker/foreman has not submitted today's daily report.
  - `reimbursement_approval`: pending reimbursements visible within the user's role/project scope.
  - `attendance_exception`: pending attendance exceptions visible within the user's role/project scope.
- `complete` intentionally returns `409` for business-derived todos, because reimbursement approval, attendance exception handling, and daily report submission must be completed from their source business pages.
- Verification completed on backend:
  - `./gradlew.bat test`
  - `./gradlew.bat build -x test`
  - HTTP smoke on `http://localhost:8080` for worker, foreman, boss, and business todo complete conflict.

### 2026-04-21 - Backend foreman attendance and todo scope delivered

- Implemented backend support for the latest foreman attendance calendar requirement:
  - `GET /api/v1/foreman/attendance/monthly?month=YYYY-MM`
  - Response remains a date-keyed monthly map, compatible with the frontend normalizer.
- The foreman monthly endpoint reads managed projects from `project_worker`, aggregates `attendance_record` by date, and returns stable empty data instead of 500 when there is no scope/data.
- Adjusted backend todo behavior to match the new Workbench scope:
  - worker/foreman visible todos are now limited to `daily_report` and `attendance_reminder`.
  - boss/admin can still use business todos such as `reimbursement_approval` and `attendance_exception`.
  - `GET /api/v1/todos?status=pending&type=daily_report,attendance_reminder` is supported.
  - `GET /api/v1/todos/summary?type=...` is also supported.
- No database schema change is required for this pass.
- Verification completed on backend:
  - `./gradlew.bat test --tests com.example.attendance.TodoServiceImplTests --tests com.example.attendance.AttendanceServiceImplTests`
  - `./gradlew.bat test`
  - `./gradlew.bat build -x test`
  - HTTP smoke for foreman monthly attendance, foreman todo scope, and boss todo type filtering.

### 2026-04-22 - 日报历史详情与模板删除修复

- 前端修复：
  - `src/pages/shared/DailyReport.tsx` 中的历史记录卡片改为可点击，点击后打开日报详情弹窗。
  - 关闭未阅日报详情时，前端会调用 `PUT /api/v1/reports/{id}/review`，成功后把列表状态从“未阅”更新为“已阅”。
  - 模板管理新增删除能力：
    - 模板列表卡片支持删除。
    - 模板编辑弹窗支持“删除当前模板”。
  - Mock 写接口已补齐：
    - `PUT /api/v1/reports/{id}/review`
    - `DELETE /api/v1/reports/templates/{id}`
- 测试与验证：
  - `npm run lint`：通过。
  - `npx vitest run src/pages/shared/DailyReport.test.tsx`：通过，2 个用例。
  - Playwright 页面冒烟验证通过：
    - 历史卡片可打开详情弹窗。
    - 关闭后首条记录状态由 `未阅` 变为 `已阅`。
    - 删除首个模板后，模板卡片数量由 `6` 变为 `5`。
- 当前真实后端联调结论：
  - `GET /api/v1/reports/history`：200
  - `GET /api/v1/reports/templates`：200
  - `PUT /api/v1/reports/{id}/review`：500
  - `DELETE /api/v1/reports/templates/{id}`：400
- 后端仍需配合：
  - 正式支持 `PUT /api/v1/reports/{id}/review`，用于老板/接收人标记日报已阅。
  - 正式支持 `DELETE /api/v1/reports/templates/{id}`，并返回 `{ "deleted": true, "id": xxx }` 或等价成功实体。
  - 如后端后续提供单条日报详情接口，可继续补充 `GET /api/v1/reports/{id}`；当前前端详情弹窗先使用历史列表已有字段渲染。

### 2026-04-22 - 日报已阅与模板删除真实后端复测

- 后端更新后重新联调，结果已从“前端已实现、后端未通”变为“前后端真实闭环通过”。
- 直接接口复测：
  - `GET /api/v1/reports/history`：200
  - `PUT /api/v1/reports/10/review`：200
  - `POST /api/v1/reports/templates`：200
  - `DELETE /api/v1/reports/templates/{tempId}`：200
- 真实页面复测（`http://localhost:3000/daily-report`）：
  - 使用工头账号 `13800000002` 登录。
  - 在“历史记录”中打开真实未阅日报 `cli targeted report`。
  - 关闭详情后，浏览器实际发出 `PUT /api/v1/reports/8/review`，返回 200。
  - 页面卡片状态从 `未阅` 更新为 `已阅`，汇报对象从 `老板` 更新为 `李班长`。
  - 通过真实后端创建临时模板 `codex-real-*`，再在“模板管理”页面中删除。
  - 浏览器实际发出 `DELETE /api/v1/reports/templates/11`，返回 200。
  - 删除后重新请求模板列表，临时模板已不存在。
- 当前结论：
  - 日报详情关闭后标记已阅：真实联调通过。
  - 模板删除：真实联调通过。
  - 这两个点不再属于前后端联调阻塞项。

### 2026-04-23 - 工头记工按正常出勤显示
- 前端规则再次调整：工头记工但当天没有上下班打卡时间时，工人端考勤日历改为按 `正常` 显示。
- 具体口径：
  - `in/out` 都为空，且后端未显式标记为 `missing/absent` -> 日历显示绿色正常状态。
  - 详情弹层仍然展示两个 `未打卡` 标签，避免误导为真实打卡成功。
  - 只有单边打卡、显式缺卡、显式缺勤才继续显示红色 `缺卡`。
- 代码变更：
  - `src/pages/worker/attendanceStatus.ts`
  - `src/pages/worker/attendanceStatus.test.ts`
- 验证结果：
  - `npx vitest run src/pages/worker/attendanceStatus.test.ts` 通过
  - `npm run test` 通过（11 个测试文件 / 40 个用例）
  - `npm run lint` 通过
  - Playwright 页面冒烟通过：
    - 工头记工样例日期显示绿色正常点
    - 详情中仍为 `未打卡`
    - 单边缺卡样例仍保留红点异常

### 2026-04-23 - 工人日报模板改为前端私有隔离
- 复测发现真实后端当前仍按旧权限口径运行：
  - `GET /api/v1/reports/templates` 对 worker 返回共享模板列表。
  - `POST /api/v1/reports/templates` 对 worker 返回 `403 无权限`。
  - `PUT /api/v1/reports/templates/{id}` 对 worker 返回 `403 无权限`。
- 同时模板列表响应中没有 owner / creator 字段，前端无法判断哪些模板属于当前工人。
- 为满足“每个工人只能看到并管理自己的模板”的产品要求，前端新增 worker 专用兜底：
  - worker 角色不再读取共享模板接口。
  - worker 模板改为按 `userId` 存储在本地 localStorage。
  - worker 可以本地新建、编辑、删除自己的模板，互相不可见（同设备按账号隔离）。
  - worker 提交日报时不再上送本地模板 `templateId`，仅提交内容和图片，避免后端无法识别本地模板 ID。
- 当前保留后端联调路径的角色：
  - foreman
  - boss
- 代码变更：
  - `src/pages/shared/DailyReport.tsx`
  - `src/pages/shared/dailyReportTemplateStorage.ts`
  - `src/pages/shared/DailyReport.test.tsx`
- 验证结果：
  - `npx vitest run src/pages/shared/DailyReport.test.tsx` 通过
  - `npm run test` 通过（11 个测试文件 / 41 个用例）
  - `npm run lint` 通过
  - Playwright 页面冒烟通过：worker 私有模板可见、共享模板隐藏、删除后本地存储同步清空
- 后端后续仍建议补齐：
  - 模板 owner 字段
  - worker/foreman/boss 的 owner-scoped 模板查询
  - worker 私有模板的服务端增删改能力

### 2026-04-23 - worker 模板跨设备同步后端接口文档
- 用户已明确需要跨设备同步，所以仅靠前端 localStorage 兜底还不够。
- 已补一份可直接交给后端的详细接口文档：
  - `C:/files/codes/attendance-codex/Attendance/docs/backend-worker-template-sync-plan-2026-04-23.md`
- 文档包含：
  - 当前真实联调问题说明
  - 推荐数据模型（基于 `daily_report_template` 扩展可见性）
  - `GET /api/v1/reports/templates`
  - `POST /api/v1/reports/templates`
  - `PUT /api/v1/reports/templates/{id}`
  - `DELETE /api/v1/reports/templates/{id}`
  - `POST /api/v1/reports` 对 `templateId` 的 ownership 校验
  - 迁移建议、验收标准、后端测试清单

### 2026-04-23 - worker 模板跨设备同步后端复测结果
- 已按交接文档对真实后端做接口级复测，结果显示后端计划基本完成。
- 真实复测通过项：
  - worker / foreman / boss 创建个人模板：`200`
  - 模板列表按 `system + self personal` 返回
  - worker 看不到 foreman 的私有模板
  - foreman 看不到 worker 的私有模板
  - system 模板返回：
    - `owner = null`
    - `editable = false`
    - `deletable = false`
  - worker 更新自己的模板：`200`
  - worker 删除 system 模板：`403`
  - worker 使用他人的 `templateId` 提交日报：`403`，消息为 `无权限使用该模板`
  - worker 使用自己的 `templateId` 提交日报：`200`
  - 成功提交返回中包含 `templateId`、`templateName`
- 当前剩余事项不在后端，而在前端：
  - `src/pages/shared/DailyReport.tsx` 里 worker 仍走本地私有模板 fallback
  - 所以后端虽然已经具备跨设备同步能力，但页面还没有切回服务端模板流
### 2026-04-23 - Worker 日报模板切回服务端同步
- 已按“直接切回服务端、不迁移旧本地模板”的口径完成前端切换。
- `src/pages/shared/DailyReport.tsx` 现已统一改为：
  - 所有角色都通过 `GET /api/v1/reports/templates` 获取模板
  - 模板管理页直接使用后端返回的 `visibility / owner / editable / deletable`
  - 系统模板显示 `系统模板` 标签且不再暴露“编辑/删除”
  - 当前用户自己的个人模板显示 `我的模板` 标签
  - 创建 / 编辑 / 删除模板成功后统一重新拉取模板列表，避免前端状态漂移
  - 创建 / 编辑 / 删除模板失败后也会重新拉取模板列表，保证 UI 与后端重新对齐
  - worker 首次成功拉取服务端模板后，会清理旧 key：`daily-report-worker-templates:{userId}`
  - 只要当前选中了模板，提交日报时都会带上 `templateId`
- 已删除不再需要的本地私有模板 helper：
  - `src/pages/shared/dailyReportTemplateStorage.ts`
- Mock 联调链路已同步升级：
  - `public/mock/daily-report-templates.json` 改为后端新 DTO
  - `src/lib/api.ts` 的 mock 模板接口现已按 `system + self` 过滤
  - mock 模板写接口已限制为仅 owner 可改/删
  - mock `POST /api/v1/reports` 已校验 `templateId` 可见性，并返回 `templateId / templateName`
- 新增/更新测试：
  - `src/pages/shared/DailyReport.test.tsx`
  - `src/lib/api.test.ts`
- 验证结果：
  - `npx vitest run src/pages/shared/DailyReport.test.tsx` 通过
  - `npx vitest run src/lib/api.test.ts` 通过
  - `npm run lint` 通过
  - `npm run test` 通过（11 个测试文件 / 46 个用例）
  - 本地 dev server 已启动并返回 `200`：`http://localhost:3000/`
