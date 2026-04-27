# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Workforce Attendance (智工考勤) — A React workforce attendance management app with role-based views. 4 roles: `worker` (工人), `foreman` (班组长), `boss` (老板), `admin` (管理员). UI is primarily in Chinese.

## Commands

```bash
npm run dev      # Start dev server on port 3000 (HMR enabled unless DISABLE_HMR=true)
npm run build    # Production build
npm run lint     # Type check (tsc --noEmit)
npm run test     # Run all unit tests (vitest run)
npm run preview  # Preview production build
npm run clean    # Remove dist folder
```

Run a single test file:
```bash
npx vitest run src/path/to/test.test.tsx
```

E2E tests use Playwright (config in `e2e/`), excluded from `npm run test`.

## Architecture

### Authentication & Routing

Two Zustand stores manage state:

- **`useAuthStore`** (`src/store/useAuthStore.ts`) — `accessToken`, `refreshToken`, `user` (with `role`), `isAuthenticated`. Persisted to localStorage under key `auth-storage`. Uses `_hasHydrated` flag to wait for rehydration before rendering.
- **`useAppStore`** (`src/store/useAppStore.ts`) — `role` only. Persisted under key `app-role-storage`. Redundant with `authStore.user.role` but still used by `MobileShell` and `RoleSync`.

**Route guards** (in `src/App.tsx`):
- `GuestGuard` wraps `/login` — redirects authenticated users to their role's home.
- `AuthGuard` wraps all other routes — redirects unauthenticated users to `/login`, and rejects users whose role isn't in `allowedRoles`.
- Admin routes require `allowedRoles={['admin']}`. Mobile routes require `['worker', 'foreman', 'boss']`.

**Role resolution flow**: `RoleSync` component checks `authStore.user.role` first (from login). Falls back to `?role=` URL param (only in mock mode) for quick switching during development.

**Layout split**:
- **Mobile roles** (worker/foreman/boss): `MobileShell` with bottom tab navigation. Routes differ per role (e.g., worker has `/`, `/attendance`, `/stats`; foreman has `/`, `/foreman-attendance`, `/exceptions`).
- **Admin**: `/admin/*` uses `WebAdminLayout` with PC sidebar.

### API Layer (`src/lib/api.ts`)

The `request<T>(endpoint, options)` function handles both mock and real API calls. All API responses follow `ApiResponse<T>` shape: `{ code, message, data }`.

**Real mode**: Sends requests to `VITE_API_BASE_URL` (proxied to `http://localhost:8081` in vite.config.ts). Attaches `Authorization: Bearer` header from auth store. On 401, queues concurrent requests and attempts token refresh via `/auth/refresh`. On refresh failure, logs out and redirects to `/login`.

**Mock mode** (`VITE_MOCK_ENABLED=true`): The mock system is fully stateful — it supports CRUD operations, not just static reads. Key behaviors:
- 600ms simulated delay on all requests
- Login: POST `/auth/login` validates against `MOCK_ACCOUNTS` (phone numbers `13800000001`–`13800000004`, password `123456`, each mapped to a role)
- Token refresh: any token starting with `mock-refresh-` succeeds
- Stateful endpoints with in-memory + localStorage persistence: worker punch in/out, foreman attendance submission, reimbursement CRUD, daily report CRUD, contract/settlement CRUD, project CRUD, file upload
- GET-only endpoints fall back to static JSON files in `public/mock/` via regex matching (first match wins)
- **Ordering matters**: more specific patterns (e.g., `/api/v1/projects/[^/]+/attendance`) must come before general ones (e.g., `/api/v1/projects`)
- Unmatched endpoints throw `RequestError(404)`

To add a new mock endpoint: add the handler in the mock section of `request()` in `api.ts` and create any needed JSON files in `public/mock/`.

### Services & Hooks

- `src/services/auth.ts` — login and refresh token API calls
- `src/services/worker.ts` — worker today-status and punch API calls
- `src/services/foreman.ts` — foreman projects, workers, attendance, site-status, exceptions API calls
- `src/hooks/useForeman.ts` — React hooks wrapping foreman service (`useForemanWorkbench`, `useForemanSite`, `useForemanExceptions`)

Other pages (boss, admin, shared) call `request()` directly inside `useEffect` hooks. Either pattern is acceptable for new pages.

### Types

- `src/types/api.ts` — `ApiResponse<T>`, `PaginatedData<T>`
- `src/types/auth.ts` — `User`, `LoginRequest`, `LoginResponse`, `RefreshResponse`
- `src/types/models.ts` — Domain models: `Worker`, `Project`, `SiteStatus`, `Exception`, `BossEmployee`, `AdminProject`, `AdminAttendanceRecord`, foreman attendance types

### UI Components

- **Dual Button System**: `src/components/ui/button.tsx` (shadcn/ui standard with CVA variants, used by Dialog/Command) vs `src/components/ui/OldButton.tsx` (custom with `isLoading` prop and orange gradient, used by ForemanWorkbench).
- **Guards**: `AuthGuard` and `GuestGuard` handle route protection with loading spinner during Zustand rehydration.
- **Layouts**: `MobileShell` (mobile bottom tabs), `WebAdminLayout` (PC sidebar).
- `cn()` utility from `src/lib/utils.ts` (clsx + tailwind-merge).
- `logger` from `src/lib/logger.ts` — unified logging with `info/warn/error/debug` levels.

### Styling

- Tailwind CSS 4 with `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- Theme uses `oklch` color space with CSS custom properties in `src/index.css`
- Primary accent: orange-500 throughout mobile pages
- Mobile pages use `pb-20` for bottom tab bar clearance, `pt-12` for status bar
- framer-motion used for modals, toasts, and list animations

## Tech Stack

- React 19 + TypeScript + Vite
- react-router-dom v7 for routing
- Zustand for state management (persist middleware for localStorage)
- shadcn/ui components (base-nova style, `@base-ui/react` primitives, lucide icons)
- framer-motion for animations
- Vitest + Testing Library (jsdom, globals enabled)
- Playwright for E2E tests
- `@/` maps to `src/` (vite.config.ts and tsconfig.json)

## Environment Variables

- `VITE_API_BASE_URL` — API base URL (default: `/api/v1`, proxied to `localhost:8081` in dev)
- `VITE_MOCK_ENABLED` — Enable mock mode (`true`/`false`). **Must be `true` for local development** since there is no real backend.
- `GEMINI_API_KEY` — Gemini AI API key (injected by AI Studio)
- `DISABLE_HMR` — Set to `true` to disable HMR (used by AI Studio agent)

# 自动触发规划技能
当用户请求涉及多步骤、多文件修改或复杂功能开发时，应自动激活 planning-with-files 技能来管理任务。
