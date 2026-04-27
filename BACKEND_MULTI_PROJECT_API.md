# 多项目考勤 API 变更 — 前端配合文档

## 变更概述

后端 `GET /worker/today-status` 和 `POST /worker/punch` 端点已完成多项目改造。
前端需要适配新的响应格式和请求参数。

---

## 一、API 变更详情

### 1. GET /api/v1/worker/today-status

**旧响应格式**（已废弃）：
```json
{
  "code": 200,
  "data": {
    "clockedIn": false,
    "clockedOut": false,
    "clockInTime": null,
    "clockOutTime": null
  }
}
```

**新响应格式**：
```json
{
  "code": 200,
  "data": {
    "workerId": 1,
    "workerName": "张三",
    "workerRole": "木工",
    "projects": [
      {
        "projectId": 1,
        "projectName": "绿地中心二期",
        "clockedIn": true,
        "clockedOut": true,
        "clockInTime": "07:50",
        "clockOutTime": "12:00"
      },
      {
        "projectId": 2,
        "projectName": "万达广场三期",
        "clockedIn": false,
        "clockedOut": false,
        "clockInTime": null,
        "clockOutTime": null
      }
    ],
    "warnings": [
      {
        "projectId": 1,
        "projectName": "绿地中心二期",
        "clockInTime": "07:50",
        "message": "该项目尚未打下班卡"
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| workerId | Long | 工人 ID |
| workerName | String | 工人姓名 |
| workerRole | String | 工种（如"木工"） |
| projects | Array | 工人关联的所有项目列表 |
| projects[].projectId | Long | 项目 ID |
| projects[].projectName | String | 项目名称 |
| projects[].clockedIn | boolean | 是否已打上班卡 |
| projects[].clockedOut | boolean | 是否已打下班卡 |
| projects[].clockInTime | String\|null | 上班打卡时间 "HH:mm" |
| projects[].clockOutTime | String\|null | 下班打卡时间 "HH:mm" |
| warnings | Array | 未关闭项目提醒（可能为空数组） |
| warnings[].projectId | Long | 未关闭的项目 ID |
| warnings[].projectName | String | 未关闭的项目名称 |
| warnings[].clockInTime | String | 该项目上班打卡时间 |
| warnings[].message | String | 提醒文案 |

### 2. POST /api/v1/worker/punch

**旧请求**（已废弃）：
```
POST /api/v1/worker/punch?type=in
```

**新请求**：
```
POST /api/v1/worker/punch?projectId=1&type=in
```

**新增参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | Long | 是 | 要打卡的项目 ID |
| type | String | 是 | "in"（上班）或 "out"（下班） |

**响应不变**：
```json
{
  "code": 200,
  "data": {
    "id": 123,
    "time": "07:50",
    "type": "in"
  }
}
```

**新增错误码**：

| HTTP 状态 | code | 场景 |
|-----------|------|------|
| 200 | 400 | projectId 为空 / 未打上班卡就打下班卡 |
| 200 | 403 | 工人不属于该项目 |
| 200 | 409 | 该项目今日已打上班卡 / 已打下班卡（重复打卡） |

---

## 二、前端 Home.tsx 改造指南

### 页面结构

```
┌─────────────────────────────┐
│ 顶部：智工考勤 + 用户头像    │  ← workerName + workerRole 从 API 读取
├─────────────────────────────┤
│ 项目选择区（卡片列表）        │  ← 从 projects[] 渲染
│  ┌────────────────────────┐ │
│  │ ● 绿地中心二期  已下班  │ │  ← clockedIn && clockedOut
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │ ○ 万达广场三期  未打卡  │ │  ← !clockedIn
│  └────────────────────────┘ │
├─────────────────────────────┤
│ ⚠ 绿地中心二期尚未打下班卡  │  ← warnings[] 非空时显示
├─────────────────────────────┤
│ 当前时间 + 打卡按钮          │
│ [上班打卡] 或 [下班打卡]     │  ← 根据选中项目的 nextPunchType
├─────────────────────────────┤
│ 今日打卡记录                 │  ← 从 projects[] 构建
└─────────────────────────────┘
```

### TypeScript 类型定义

```typescript
interface TodayStatus {
  workerId: number;
  workerName: string;
  workerRole: string;
  projects: ProjectStatus[];
  warnings: UnclosedWarning[];
}

interface ProjectStatus {
  projectId: number;
  projectName: string;
  clockedIn: boolean;
  clockedOut: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
}

interface UnclosedWarning {
  projectId: number;
  projectName: string;
  clockInTime: string;
  message: string;
}
```

### 核心逻辑

#### nextPunchType 推导

```typescript
type NextPunchType = "in" | "out" | null;

function getNextPunchType(project: ProjectStatus): NextPunchType {
  if (!project.clockedIn) return "in";        // 没打上班卡 → 上班打卡
  if (!project.clockedOut) return "out";      // 打了上班没打下班 → 下班打卡
  return null;                                // 都打了 → 今日已完成
}
```

- `"in"` → 按钮显示"上班打卡"，可点击
- `"out"` → 按钮显示"下班打卡"，可点击
- `null` → 按钮显示"今日已完成"，disabled

#### 默认选中项目

```typescript
function getDefaultProject(projects: ProjectStatus[]): ProjectStatus | null {
  // 优先选中正在进行中的项目（已上班未下班）
  const active = projects.find(p => p.clockedIn && !p.clockedOut);
  if (active) return active;
  // 否则选第一个未完成的项目
  const incomplete = projects.find(p => !p.clockedIn || !p.clockedOut);
  if (incomplete) return incomplete;
  // 都完成了，选第一个
  return projects[0] || null;
}
```

#### 打卡记录列表构建

```typescript
function buildRecords(projects: ProjectStatus[]) {
  return projects.flatMap(p => {
    const list = [];
    if (p.clockInTime) {
      list.push({
        projectName: p.projectName,
        type: "上班打卡",
        time: p.clockInTime
      });
    }
    if (p.clockOutTime) {
      list.push({
        projectName: p.projectName,
        type: "下班打卡",
        time: p.clockOutTime
      });
    }
    return list;
  });
}
```

每条记录显示 **项目名 + 类型 + 时间**。

### 打卡流程

```typescript
// 1. 页面加载时获取状态
const res = await request<TodayStatus>('/api/v1/worker/today-status');
const status = res.data;

// 2. 用户选中某个项目
const selectedProject = status.projects[index];

// 3. 推导按钮文字
const punchType = getNextPunchType(selectedProject);

// 4. 打卡
await request('/api/v1/worker/punch', {
  method: 'POST',
  // 注意：参数通过 query string 传递
});
// 实际请求：POST /api/v1/worker/punch?projectId={selectedProject.projectId}&type={punchType}

// 5. 打卡成功后刷新状态
const updated = await request<TodayStatus>('/api/v1/worker/today-status');
```

### 项目状态显示文字

| clockedIn | clockedOut | 显示文字 | 样式建议 |
|-----------|------------|---------|---------|
| false | false | "未打卡" | 灰色 |
| true | false | "上班中" | 绿色/蓝色 |
| true | true | "已完成" | 灰色/已完成标记 |

### 去掉硬编码

- ~~"绿地中心二期"~~ → `projects[selectedIndex].projectName`
- ~~"张三 (木工)"~~ → `${workerName} (${workerRole})`
- ~~"当前项目: 绿地中心二期"~~ → `当前项目: ${selectedProject.projectName}`
- "已进入打卡范围" → 暂时保留硬编码（GPS 功能未实现）

---

## 三、不需要改的

- 路由：不变
- 认证 / auth store：不变
- 其他页面（Attendance、Stats 等）：不受影响
- 类型文件 `types/models.ts`：可以在 Home.tsx 内部定义类型，不需要全局新增
