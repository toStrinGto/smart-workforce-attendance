# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Smart Workforce Attendance (智工考勤) - A React workforce attendance management app with role-based views. 4 roles: `worker` (工人), `foreman` (班组长), `boss` (老板), `admin` (管理员). UI is primarily in Chinese.

## Commands

```bash
npm run dev      # Start dev server on port 3000 (HMR enabled unless DISABLE_HMR=true)
npm run build    # Production build
npm run lint     # Type check (tsc --noEmit)
npm run test     # Run all tests (vitest run)
npm run preview  # Preview production build
npm run clean    # Remove dist folder
```

Run a single test file:
```bash
npx vitest run src/path/to/test.test.tsx
```

## Architecture

### Role-Based Routing

Role is stored in Zustand (`src/store/useAppStore.ts`) with localStorage persistence under key `app-role-storage`. Default role: `worker`.

- **Mobile roles** (worker/foreman/boss): Switch via URL param `?role=worker|foreman|boss`. The `RoleSync` component in [App.tsx](src/App.tsx) reads the param and writes to the store. Uses `MobileShell` with bottom tab navigation.
- **Admin**: Determined by `/admin/*` path prefix, not URL param. Uses `WebAdminLayout` with PC sidebar. No auth guard — any user can access `/admin/*`.

### API Mock System

Set `VITE_MOCK_ENABLED=true` in `.env` to enable mock mode. The `request()` function in [api.ts](src/lib/api.ts) simulates 600ms delay and maps RESTful GET endpoints to static JSON files in `public/mock/` via regex matching. Non-GET requests return `{ code: 200, message: 'success', data: null }` immediately (no real mutations).

**Endpoint-to-mock mapping** (evaluated top-to-bottom, first match wins):
| Endpoint Regex | Mock File |
|---|---|
| `/api/v1/attendance/summary` | `attendance.json` |
| `/api/v1/projects/[^/]+/attendance` | `project-detail.json` |
| `/api/v1/workers/[^/]+/attendance` | `person-records.json` |
| `/api/v1/employees/[^/]+/attendance` | `employee-records.json` |
| `/api/v1/reimbursements/pending` | `reimbursement-approvals.json` |
| `/api/v1/reimbursements/history` | `reimbursement-history.json` |
| `/api/v1/reports/templates` | `daily-report-templates.json` |
| `/api/v1/reports/history` | `daily-report-history.json` |
| `/api/v1/dashboard/boss` | `boss-home.json` |
| `/api/v1/contracts` | `contracts.json` |
| `/api/v1/income-settlements` | `income-settlements.json` |
| `/api/v1/projects` | `projects.json` |
| `/api/v1/reimbursement/overview` | `reimbursement-overview.json` |
| `/api/v1/reimbursement/project-detail` | `project-reimbursement-detail.json` |
| `/api/v1/foreman/projects` | `foreman-projects.json` |
| `/api/v1/foreman/workers` | `foreman-workers.json` |
| `/api/v1/foreman/site-status` | `foreman-site-status.json` |
| `/api/v1/foreman/exceptions` | `foreman-exceptions.json` |

Unmatched endpoints throw `RequestError(404, "未找到Mock路由: ...")`. To add a new endpoint, add an `else if` branch and create the corresponding JSON file in `public/mock/`.

**Important**: `/api/v1/projects` must come after more specific `/api/v1/projects/...` patterns since it uses regex matching (first match wins).

### Data Fetching Patterns

Only the foreman module uses a proper service/hook separation (`src/services/foreman.ts` + `src/hooks/useForeman.ts`). All other pages call `request()` directly inside `useEffect` hooks. When adding new pages, either pattern is acceptable.

### Dual Button System

There are two button components:
- `src/components/ui/button.tsx` — shadcn/ui standard (base-nova, CVA variants). Used by shadcn components (Dialog, Command).
- `src/components/ui/OldButton.tsx` — Custom button with `isLoading` prop and orange gradient. Used by `ForemanWorkbench`.

### Styling

- Tailwind CSS 4 with `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- Theme uses `oklch` color space with CSS custom properties in `src/index.css`
- Primary accent: orange-500 throughout mobile pages
- Mobile pages use `pb-20` for bottom tab bar clearance, `pt-12` for status bar
- framer-motion used for modals, toasts, and list animations
- `cn()` utility from `src/lib/utils.ts` (clsx + tailwind-merge)

## Tech Stack

- React 19 + TypeScript + Vite
- react-router-dom v7 for routing
- Zustand for state management (persist middleware for localStorage)
- shadcn/ui components (base-nova style, `@base-ui/react` primitives, lucide icons)
- framer-motion for animations
- Vitest + Testing Library (jsdom, globals enabled)
- `@/` maps to `src/` (vite.config.ts and tsconfig.json)

## Environment Variables

- `VITE_API_BASE_URL` — API base URL (default: `/api/v1`)
- `VITE_MOCK_ENABLED` — Enable mock mode (`true`/`false`). **Must be `true` for local development** since there is no real backend.
- `GEMINI_API_KEY` — Gemini AI API key (injected by AI Studio)
- `DISABLE_HMR` — Set to `true` to disable HMR (used by AI Studio agent)

# 自动触发规划技能
当用户请求涉及多步骤、多文件修改或复杂功能开发时，应自动激活 planning-with-files 技能来管理任务。