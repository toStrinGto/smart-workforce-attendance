# 后端接口问题修复清单

> 前端环境：`http://localhost:3000` | 后端环境：`http://localhost:8080`
> 测试账号：`13800000002` / `123456`（班组长角色）
> 测试时间：2026-04-19

---

## 问题 1：报销历史接口金额字段返回字符串，导致前端崩溃

### 接口

`GET /api/v1/reimbursements/history`

### 现象

前端访问报销记录页面时报错：

```
historySummary.pendingAmount.toFixed is not a function
```

### 原因

后端返回的金额字段是**字符串类型**，且带有千分位逗号格式化。前端使用 `.toFixed(2)` 方法格式化数字，该方法只存在于 `number` 类型上，字符串调用会报错。

### 后端当前返回

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "summary": {
      "pendingAmount": "600",
      "reimbursedAmount": "2,100"
    },
    "history": [
      {
        "id": 3,
        "amount": "1,800",
        "status": "已批准"
      }
    ]
  }
}
```

### 期望返回（参考 BACKEND_API.md EP-30）

金额字段应返回 **number 类型**，不要加千分位逗号（格式化由前端负责）：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "summary": {
      "pendingAmount": 600,
      "reimbursedAmount": 2100
    },
    "history": [
      {
        "id": 3,
        "amount": 1800,
        "status": "已批准"
      }
    ]
  }
}
```

### 修复要点

1. 所有金额字段（`pendingAmount`、`reimbursedAmount`、`amount`）返回 `number` 类型，不要返回字符串
2. **不要在金额中加千分位逗号**（如 `"2,100"`），前端会自行格式化显示
3. 检查其他接口是否也存在同样问题（返回金额的地方统一改为 number）

### 影响范围

涉及以下接口中所有金额相关字段，请一并排查：

| 接口 | 需检查的金额字段 |
|------|----------------|
| `GET /api/v1/reimbursements/history` | `summary.pendingAmount`, `summary.reimbursedAmount`, `history[].amount` |
| `GET /api/v1/reimbursements/pending` | `records[].amount` |
| `GET /api/v1/reimbursement/overview` | 所有金额字段 |
| `GET /api/v1/reimbursement/project-detail` | 所有金额字段 |
| `GET /api/v1/contracts` | `contractAmount`, `settledAmount` 等 |
| `GET /api/v1/income-settlements` | 所有金额字段 |
| `GET /api/v1/dashboard/boss` | 所有金额字段 |
| `PUT /api/v1/admin/workers/{id}/wage` 请求和响应 | `dailyWage` 等 |

---

## 问题 2：班组长记工后刷新页面，已记工数据消失

### 接口

`GET /api/v1/foreman/workers`

### 现象

班组长使用批量记工成功后，刷新页面（或切换项目再切回来），之前已记工的工人列表中看不到已记工的标记（"已记: 1天"标签消失）。

### 原因

前端记工成功后只在内存中记录了 `submittedRecords`（React state），刷新页面后丢失。而 `GET /api/v1/foreman/workers` 返回的工人数据中**没有包含今日记工状态**，前端无法得知哪些工人今日已被记工。

### 后端当前返回

```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "id": 1, "name": "张三", "role": "木工", "avatar": "张", "dailyWage": 400 },
    { "id": 9, "name": "王铁柱", "role": "钢筋工", "avatar": "王", "dailyWage": 380 }
  ]
}
```

### 期望返回

在工人数据中增加**今日记工信息**，前端据此显示已记工标记：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "id": 1, "name": "张三", "role": "木工", "avatar": "张", "dailyWage": 400, "todayAttendance": { "dayShift": 1, "overtimeHours": 2 } },
    { "id": 9, "name": "王铁柱", "role": "钢筋工", "avatar": "王", "dailyWage": 380, "todayAttendance": null }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `todayAttendance` | `object` 或 `null` | 今日记工记录，未记工则为 `null` |
| `todayAttendance.dayShift` | `number` | 白班天数（0 / 0.5 / 1） |
| `todayAttendance.overtimeHours` | `number` | 加班小时数 |

### 修复要点

1. 在 `GET /api/v1/foreman/workers` 查询工人列表时，关联查询 `attendance_record` 表中**当天日期**的记录
2. 如果该工人当天有记工记录，将 `dayShift` 和 `overtimeHours` 作为 `todayAttendance` 对象返回
3. 如果没有记工记录，返回 `todayAttendance: null`
4. 同样支持 `?projectId=` 参数过滤

### 前端适配

后端增加此字段后，前端会做以下适配：
- `Worker` 类型增加 `todayAttendance` 可选字段
- 页面加载时根据 `todayAttendance` 恢复 `submittedRecords` 状态
- 已记工工人显示绿色"已记: X天"标签

---

## 通用规范提醒

根据 `BACKEND_API.md` 中的接口规范，JSON 响应中的数值类型应遵循以下原则：

- **金额、工时、人数等数量字段** → 返回 `number` 类型（如 `600`、`2100.50`）
- **ID、手机号等标识字段** → 返回 `number` 或 `string` 均可（视具体接口规范）
- **千分位格式化、小数位数控制** → 由前端负责，后端只返回原始数值
