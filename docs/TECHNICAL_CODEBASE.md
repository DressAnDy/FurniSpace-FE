# FurniSpace FE Technical Codebase Standard

Tài liệu này là chuẩn kỹ thuật cho frontend FurniSpace. Dev mới chỉ cần đọc và implement theo file này để giữ codebase thống nhất về dependency, cấu trúc thư mục, coding style, testing, CI/CD và quy ước review.

## 1. Technical Stack

### Core runtime

| Layer | Package | Version target | Vai trò |
| --- | --- | --- | --- |
| React | `react`, `react-dom` | `^18` | UI framework, Concurrent Mode, Suspense |
| TypeScript | `typescript` | `^5` | Static typing, strict mode, path alias |
| Vite | `vite`, `@vitejs/plugin-react` | `^5` | Build tool, HMR, ESM, path alias config |
| React Router | `react-router-dom` | `^6` | Client-side routing, nested routes, loaders |

### 3D engine

| Layer | Package | Version target | Vai trò |
| --- | --- | --- | --- |
| Babylon.js | `@babylonjs/core` | `^7` | 3D engine, scene, mesh, camera, lighting |
| Babylon Loaders | `@babylonjs/loaders` | `^7` | GLTF, OBJ, STL asset import |
| Babylon GUI | `@babylonjs/gui` | `^7` | In-scene 2D/3D UI overlay |

Note: repo hiện tại đang dùng package legacy `babylonjs` và `babylonjs-loaders`. Khi refactor lớn, ưu tiên migrate sang scoped packages `@babylonjs/*` để tree-shaking và import rõ ràng hơn.

### State management

| Layer | Package | Version target | Vai trò |
| --- | --- | --- | --- |
| Zustand | `zustand` | `^4` | Global client state, devtools, persist middleware |
| TanStack Query | `@tanstack/react-query` | `^5` | Server state, cache, mutation, sync |
| Immer | `immer` | latest compatible | Immutable updates cho Zustand store phức tạp |

### Data fetching / API

| Layer | Package | Version target | Vai trò |
| --- | --- | --- | --- |
| Axios | `axios`, `axios-retry` | `^1` | HTTP client, interceptors, retry logic |
| MSW | `msw` | `^2` | Mock API trong test và local development |

### UI / styling

Chọn một design system chính cho app surface. Không trộn MUI và Tailwind trong cùng một component trừ khi đang migrate có kế hoạch.

| Option | Package | Version target | Vai trò |
| --- | --- | --- | --- |
| MUI | `@mui/material`, `@emotion/react`, `@emotion/styled` | `^5` | Component library, theming, DataGrid |
| Tailwind CSS | `tailwindcss`, `@tailwindcss/forms` | `^3` | Utility-first, custom design system |
| Icons | `@tabler/icons-react` | latest compatible | Icon set SVG cho React |
| Class merge | `clsx`, `tailwind-merge` | latest compatible | Merge class names an toàn với Tailwind |

Current repo đang có MUI. Nếu chọn Tailwind làm chuẩn mới, cần cài và cấu hình Tailwind trước khi migrate component.

### Form / validation

| Layer | Package | Version target | Vai trò |
| --- | --- | --- | --- |
| Form | `react-hook-form` | `^7` | Form state, validation, performance |
| Schema | `zod` | `^3` | Schema validation, TypeScript inference |

### Testing

| Layer | Package | Version target | Vai trò |
| --- | --- | --- | --- |
| Unit test | `vitest`, `@vitest/coverage-v8` | latest compatible | Unit test, coverage, jsdom |
| Component test | `@testing-library/react`, `@testing-library/user-event` | latest compatible | Component test, user-event simulation |
| E2E | `@playwright/test` | `^1` | Cross-browser E2E và CI integration |
| Storybook | `storybook`, `@storybook/react-vite` | latest compatible | Component development, docs, visual test |

### Code quality / Git hooks

| Layer | Package | Vai trò |
| --- | --- | --- |
| ESLint | `eslint`, `eslint-plugin-react-hooks`, `@typescript-eslint/*` | Linting, React/TS rules, import order |
| Prettier | `prettier`, `eslint-config-prettier` | Auto format, tránh conflict với ESLint |
| Husky + lint-staged | `husky`, `lint-staged` | Pre-commit hook cho changed files |
| Commitlint | `@commitlint/cli`, `@commitlint/config-conventional` | Enforce conventional commit format |

### CI/CD and monitoring

| Layer | Package / Tool | Vai trò |
| --- | --- | --- |
| GitHub Actions | `.github/workflows/*.yml` | Pipeline lint, test, build, deploy |
| size-limit | `size-limit`, `@size-limit/vite` | Bundle size check, fail CI nếu vượt limit |
| Lighthouse CI | `@lhci/cli` | Web Vitals score check mỗi build |
| Sentry | `@sentry/react`, `@sentry/vite-plugin` | Error tracking, session replay production |

## 2. Project Structure

Chuẩn thư mục:

```txt
src/
  app/
    App.tsx
    providers/
    styles/
  features/
    home/
      HomePage.tsx
      HomePage.css
      index.ts
    viewer3d/
      components/
      engine/
      hooks/
      pages/
      index.ts
  services/
    api/
    queries/
  shared/
    components/
    lib/
  stores/
  test/
```

Quy ước:

- `app/`: composition cấp app, routing, providers, global styles.
- `features/<feature>/`: code theo domain/feature. Page, component private, hook private, CSS private đặt trong feature.
- `shared/`: component/lib tái sử dụng giữa nhiều feature.
- `services/api/`: HTTP client, interceptors, API types.
- `services/queries/`: TanStack Query hooks.
- `stores/`: Zustand global stores.
- `test/`: test setup dùng chung.

Không import ngược từ `features/*` vào `shared/*`. `shared` phải độc lập với business feature.

## 3. TypeScript Rules

Required:

- Bật `strict: true`.
- Dùng path alias `@/*` trỏ về `src/*`.
- Ưu tiên `type` cho object shape, union, props; dùng `interface` khi cần extend public contract.
- Không dùng `any` nếu chưa có lý do rõ. Nếu bắt buộc, comment ngắn lý do.
- Props component phải có type rõ ràng.
- API response phải được type ở `src/services/api/types.ts` hoặc file type riêng theo domain.

Example:

```ts
type ProjectCardProps = {
  title: string;
  imageUrl: string;
  category?: string;
};
```

## 4. React Rules

Component:

- Component là function component.
- Component file dùng PascalCase: `ProjectCard.tsx`.
- Hook file dùng camelCase và prefix `use`: `useScene.ts`.
- Không đặt business logic dài trực tiếp trong JSX. Tách thành hook, helper hoặc data mapper.
- Không fetch data trực tiếp trong component bằng `useEffect` nếu đó là server state. Dùng TanStack Query.
- Dùng `Suspense` ở route/feature boundary khi lazy-load.

Routing:

- Route chính khai báo trong `src/app/App.tsx` hoặc route config riêng nếu app lớn hơn.
- Page component đặt trong `features/<feature>/pages` hoặc `features/<feature>/<FeaturePage>.tsx` nếu feature nhỏ.
- URL path dùng kebab-case.

## 5. Styling Standard

### Nếu dùng Tailwind làm chuẩn

Cài đặt required:

```bash
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npm install clsx tailwind-merge
```

Required files:

```txt
tailwind.config.ts
postcss.config.js
src/app/styles/global.css
```

`global.css` phải có:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Class names:

- Dùng utility class trực tiếp cho layout nhỏ.
- Dùng component class + `@apply` cho pattern lặp lại.
- Dùng `clsx` + `tailwind-merge` cho conditional class.
- Không inline style trong JSX, trừ dynamic value thật sự cần runtime.
- Không dùng MUI `sx` trong component Tailwind.

Helper chuẩn:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Nếu dùng MUI làm chuẩn

- Style qua theme token trước, sau đó mới tới `sx`.
- Shared component nên expose variant rõ ràng.
- Không trộn CSS module/Tailwind vào MUI component nếu không cần.
- Theme đặt tại `src/app/providers/theme.ts`.

### Rule chung

- Không để object style lớn trong `.tsx`.
- CSS riêng của feature đặt cạnh feature: `HomePage.css`, `ProjectCard.css`.
- Global CSS chỉ chứa reset, font, root variables, Tailwind directives hoặc token global.
- Không dùng magic color lặp lại nhiều nơi. Khi app ổn định, đưa vào CSS variables hoặc Tailwind theme.

## 6. State Management Rules

### Zustand

Dùng cho client state:

- UI state: modal, sidebar, selected panel.
- 3D scene state: camera mode, selected mesh, transform tool.
- Persisted preferences: theme, layout option.

Store naming:

```txt
src/stores/uiStore.ts
src/stores/sceneStore.ts
src/stores/appStore.ts
```

Rules:

- Store nhỏ theo domain, không gom tất cả vào một store lớn.
- Selector phải hẹp để tránh rerender rộng.
- Dùng `immer` khi update nested state phức tạp.
- Dùng `persist` chỉ cho state cần lưu qua reload.

### TanStack Query

Dùng cho server state:

- List/detail data từ API.
- Mutation create/update/delete.
- Cache invalidation.

Query hook naming:

```txt
useAssets.ts
useProjects.ts
useProjectDetail.ts
```

Rules:

- Query key phải stable và khai báo nhất quán.
- Không gọi Axios trực tiếp từ component.
- Mutation phải invalidate hoặc update cache rõ ràng.

## 7. API Layer Rules

Structure:

```txt
src/services/api/httpClient.ts
src/services/api/client.ts
src/services/api/types.ts
src/services/queries/useAssets.ts
```

Rules:

- Axios instance đặt ở `httpClient.ts`.
- Interceptor auth/error/retry đặt ở API layer.
- `axios-retry` config tập trung, không config rải rác.
- API function không chứa UI concern như toast, modal, route redirect trừ khi có adapter rõ.
- Error mapping trả về app error type thống nhất.

Example:

```ts
export type ApiError = {
  code: string;
  message: string;
  status?: number;
};
```

## 8. Babylon.js Rules

3D code không đặt trực tiếp trong React component.

Structure:

```txt
src/features/viewer3d/
  components/SceneCanvas.tsx
  engine/SceneManager.ts
  hooks/useScene.ts
```

Rules:

- `SceneCanvas.tsx` chỉ quản lý canvas lifecycle.
- Babylon scene/camera/light/mesh logic đặt trong `SceneManager`.
- Cleanup engine, scene, texture, observer khi unmount.
- Asset loader import từ `@babylonjs/loaders` khi migrate scoped packages.
- Không lưu Babylon object nặng vào React state. Dùng ref hoặc class manager.

## 9. Forms and Validation

Required stack:

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

Rules:

- Schema là source of truth.
- Infer TS type từ Zod schema.
- Form component không tự define validation string rải rác.
- API payload phải map từ validated form values.

Example:

```ts
const projectSchema = z.object({
  name: z.string().min(1),
  area: z.number().positive(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;
```

## 10. Testing Standard

Minimum required:

- Shared component: component test.
- Store: unit test cho action quan trọng.
- Query hook/API: mock bằng MSW.
- Critical user flow: Playwright E2E.
- Visual/component docs: Storybook story.

Commands:

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
npm run storybook
```

Test naming:

```txt
Button.test.tsx
Modal.test.tsx
DataTable.test.tsx
```

Testing rules:

- Test behavior, không test implementation detail.
- Dùng `screen.getByRole` trước, sau đó mới đến text/test id.
- Không mock toàn bộ component tree nếu có thể test thật.
- Với API, dùng MSW thay vì mock Axios trực tiếp trong từng test.

## 11. Storybook Standard

Mỗi shared component cần có story:

```txt
Button.stories.tsx
Modal.stories.tsx
DataTable.stories.tsx
```

Stories cần có:

- Default state.
- Disabled/loading/error state nếu component hỗ trợ.
- Responsive hoặc long-content case nếu có rủi ro layout.
- Interaction story cho component có user action quan trọng.

## 12. Lint, Format, Git Hooks

Required scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "build": "tsc -b && vite build"
  }
}
```

Pre-commit:

- `lint-staged` chạy ESLint/Prettier trên staged files.
- Không chạy full build ở pre-commit nếu repo lớn; chạy ở CI.

Commit format:

```txt
feat(home): implement landing hero
fix(api): normalize retry error handling
refactor(viewer3d): isolate scene lifecycle
test(modal): cover close interaction
```

## 13. CI/CD Standard

GitHub Actions minimum pipeline:

1. Install dependencies with `npm ci`.
2. Run `npm run lint`.
3. Run `npm run test:coverage`.
4. Run `npm run build`.
5. Run Playwright on main/release branches.
6. Run size-limit.
7. Run Lighthouse CI for deployed preview.

CI must fail on:

- TypeScript error.
- ESLint error.
- Unit test failure.
- E2E failure on protected branches.
- Bundle size above configured limit.
- Lighthouse score below configured threshold.

## 14. Monitoring Standard

Production monitoring:

- Use `@sentry/react` for runtime error tracking.
- Use `@sentry/vite-plugin` for source map upload.
- Enable session replay only for production/staging with privacy masking.
- Never log secrets, tokens, PII, phone numbers, or raw form payloads.

Sentry setup belongs in:

```txt
src/app/providers/sentry.ts
```

## 15. Environment Variables

Vite env naming:

```txt
VITE_API_BASE_URL=
VITE_SENTRY_DSN=
VITE_APP_ENV=local|staging|production
```

Rules:

- Only expose variables with `VITE_` prefix to frontend.
- `.env` is ignored.
- `.env.example` must be committed.
- Never commit real secret values.

## 16. Implementation Checklist for New Features

Before coding:

- Confirm feature folder.
- Confirm UI system: MUI or Tailwind.
- Confirm data ownership: local state, Zustand, or TanStack Query.
- Confirm API types and validation schema.

During coding:

- Add component/page under `features/<feature>`.
- Keep shared reusable pieces in `shared/components`.
- Do not put large style object in `.tsx`.
- Do not call API directly inside UI component.
- Keep route wiring inside app route config.

Before PR:

- `npm run lint`
- `npm run test`
- `npm run build`
- Add/update Storybook stories for shared components.
- Add/update tests for changed behavior.
- Check responsive layout at mobile, tablet, desktop.

## 17. Current Repo Gap Checklist

Already present:

- React 18
- TypeScript 5
- Vite 5
- React Router 6
- Zustand 4
- TanStack Query 5
- Axios and axios-retry
- MUI 5
- Tabler Icons
- Vitest
- Testing Library
- Storybook
- ESLint

Recommended additions if this standard is adopted fully:

- Tailwind CSS stack if Tailwind becomes the chosen UI standard.
- `clsx` and `tailwind-merge` if Tailwind is used.
- `react-hook-form`, `zod`, `@hookform/resolvers`.
- MSW for API test mocks.
- Playwright for E2E.
- Prettier and `eslint-config-prettier`.
- Husky, lint-staged, Commitlint.
- size-limit, Lighthouse CI.
- Sentry packages and provider setup.
- Migrate `babylonjs` packages to `@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/gui`.

