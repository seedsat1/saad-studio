# Saad Agent Design Reference Index

Purpose: give Saad Agent a safe, deterministic map for using the local UI/design reference packs in `DEZ` during page, dashboard, SaaS, admin, chat, settings, pricing, auth, and responsive UI work.

This file is a reference index only. It is not a dependency manifest, not a copy source, and not a license override.

## Authoritative File Manifest

The complete file-level source is:

`saad-agent/DESIGN_REFERENCE_MANIFEST.json`

That manifest is generated from the actual files under `DEZ` and must be treated as the authoritative inventory for design references. This markdown file explains how to use the references; the manifest proves what files exist and gives category examples.

If `DEZ` changes, regenerate the manifest from `saad-agent`:

`npm run generate:dez-manifest`

Saad Agent must not rely only on this written map for design work. For UI/design/page tasks, it should use the manifest categories to select relevant files, then inspect the real target workspace and relevant local reference files before implementing.

## Reference Root

Current local reference root:

`saad-agent/release-production-v4/win-unpacked/DEZ`

Contents inspected:

- `shadcn-dashboard-landing-template-main`
- `shadcn-admin-kit-main`
- `ui-main`
- `awesome-shadcn-ui-main`
- `awesome-ui-libraries-master`

The matching `.zip` archives in the same folder are backups/download artifacts. Prefer the extracted folders for read-only inspection.

## Non-Negotiable Rules

- Use these projects as design and architecture references only.
- Do not copy large source files blindly.
- Do not install new libraries unless the user explicitly approves dependency changes.
- Do not modify files inside `DEZ`.
- Do not execute unknown scripts from reference projects.
- Do not treat `DEZ` as the target workspace for user page creation unless the user explicitly says the output must go there.
- When the user gives a target path such as `C:\Users\PC\Desktop\lang`, write only in that target path after approval.
- If the user asks for Arabic language support but says no RTL, keep layout direction LTR and translate text only.
- Keep user-provided image folders as asset sources, not execution workspaces.

## Primary Map

Use these paths as the first places to inspect when the task matches their purpose.

### Landing / SaaS / AI Studio pages

Use for hero sections, product navbars, marketing sections, feature tiles, pricing CTAs, and dark SaaS page composition.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/landing`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/nextjs-version/src/app/landing`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/public`

### Dashboards and dense product tools

Use for app dashboards, cards, charts, tables, KPI blocks, split panes, and operational layouts.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/dashboard`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/dashboard-2`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/nextjs-version/src/app/(dashboard)`

### Chat UI

Use for conversation lists, message panes, input bars, attachment-like surfaces, and assistant workspace layouts.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/chat`

### Settings and management panels

Use for provider/model settings, account settings, security settings, forms, toggles, select controls, and admin-like configuration pages.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/settings`
- `DEZ/shadcn-admin-kit-main/shadcn-admin-kit-main`

### Auth pages

Use for login, signup, forgot-password, verification, and account access layouts.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/auth`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/nextjs-version/src/app/(auth)`

### Pricing pages

Use for pricing cards, plan comparison, billing CTAs, feature lists, and subscription UI.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/pricing`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/nextjs-version/src/app/(dashboard)/pricing`

### Tasks, users, calendar, FAQ

Use for maintenance/task workflows, user management, schedules, help sections, and admin utilities.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/tasks`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/users`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/calendar`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/app/faqs`

### Components and UI primitives

Use for component naming, composition patterns, states, and accessible controls.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/components`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/components/ui`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/nextjs-version/src/components`
- `DEZ/ui-main/ui-main`

### Theme and customization

Use for theme variables, dark/light modes, layout density, customizer panels, and token organization.

- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/components/theme-customizer`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/config`
- `DEZ/shadcn-dashboard-landing-template-main/shadcn-dashboard-landing-template-main/vite-version/src/utils`

### Curated lists

Use only as discovery pointers. Do not treat these as implementation code.

- `DEZ/awesome-shadcn-ui-main`
- `DEZ/awesome-ui-libraries-master`

## Design Workflow For Saad Agent

When a user asks Saad Agent to design or improve a page:

1. Inspect the real target workspace first.
2. Identify framework and existing file structure.
3. If the task is UI/design-related, inspect the relevant `DEZ` reference category above.
4. Produce or implement an original design adapted to the user's project.
5. Use existing project dependencies and assets before suggesting new packages.
6. Use local user-provided images when a folder is provided.
7. Verify with the best available local check: static file openability, build, typecheck, lint, or targeted source inspection.
8. Report files modified, assets used, verification performed, and any missing dependency/API endpoint honestly.

## Quality Bar

Saad Agent design work should avoid generic outputs such as plain welcome pages, empty gradients, placeholder boxes, or unstyled forms. A page implementation should include real structure, hierarchy, spacing, imagery, responsive behavior, and clear interaction states that match the requested product purpose.
