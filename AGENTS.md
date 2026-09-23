# AGENTS.md

School project (Proyecto Integrador III, Escuela Técnica N°20, Buenos Aires, 2026): "TIC & Stock", a stock/inventory web app for the TIC workshop with barcode check-out. UI copy and docs are in **Spanish** — keep new UI text in Spanish (but see the ASCII gotcha below).

## Repo layout

- `Proyecto Integrador III - 6°2° - 2026(1).md` — assignment spec **and source of truth for architecture and requirements** (diagnóstico, alcance, PMV, Product Backlog T-01…T-53, Sprint plan, Actividad 24 = architecture decision). Read it before changing features.
- `tic-y-stock/` — **the active codebase** (stage 2: Sprints 3-5 — catálogo, panel admin, CRUD inventario). Work here.
- `Figma/` — Figma Make export of the UI prototype. **Visual reference ONLY** (colors, layout). Do NOT copy its React/Vite architecture — the team explicitly rejected it.
- `docs/` — 20 files pushed by a teammate (commit `1afca54`) describing **another project ("VetConnect", Prisma/PostgreSQL/Supabase)**. Unrelated noise; not referenced by any code. Keep unless the team decides to remove it.
- `Aplicación de los Lineamientos Generales - TIC & Stock.md` — doc explaining how the "Lineamientos Generales para el Desarrollo" apply to TIC & Stock.
- `AGENTS.md` — this file.

## Architecture (Actividad 24 in the spec — do not deviate)

Monolithic 3-layer app: **Node.js + Express** (routes → controllers → middleware), **MySQL** (`mysql2` pool), **EJS** views, **express-session + bcrypt** auth, **multer** for item photos. Structure in `tic-y-stock/`: `routes/`, `controllers/`, `middleware/`, `models/` (db.js, user, item, movimiento, alerta, contacto), `views/` (EJS + partials), `public/` (css/js + `uploads/items/` photos, gitignored), `db/schema.sql` (6 tables), `scripts/`.

## Commands (in `tic-y-stock/`)

- `npm install` · `npm start` (node server.js) · `npm run dev` (nodemon)
- `npm run db:seed` — creates the initial `superusuario` account (env: `SEED_NOMBRE`, `SEED_EMAIL`, `SEED_CONTRASEÑA`; defaults `docente@ticystock.ar` / `docente123`)
- DB setup: `mysql -u root < db/schema.sql` (DB `tic_stock`, 6 tables: `usuarios`, `items`, `movimientos`, `alertas`, `solicitudes`, `contactos`)
- **No lint, typecheck, or test scripts.** Verify with manual flow: start server, `curl.exe` against `/login`, `/register`, `/panel`, `/admin/inventario`, `/admin/usuarios`, `/institucional`, `/contacto`.
- E2E smoke script (PowerShell) lives at `%LOCALAPPDATA%\Temp\opencode\test_sprints.ps1` — boots the server, exercises admin CRUD + photo upload + alumno + public flows, cleans up its test data. Reuse/adapt for new stages.
- Windows gotcha: PowerShell blocks `npm`/`npx` `.ps1` shims → use `npm.cmd` / `npx.cmd` (and `cmd /c` for `mysql < file` redirection). ALSO: don't name a PowerShell function `H` (collides with the `Get-History` alias).

## Gotchas

- **No accented identifiers.** Windows MySQL client mangles UTF-8 accents (table/column names AND form field names must be ASCII: `contrasena_hasheada`, `confirmar_contrasena`). Spanish is fine in UI text and error messages, not in identifiers/fields.
- `.env` supported (`PORT`, `DB_*`, `SESSION_SECRET`, `SEED_*`); defaults target XAMPP MySQL (root, no password) and `0.0.0.0:3000` (school LAN access).
- Session: cookie `ticstock.sid`, httpOnly, 30 min inactivity expiry (rolling) — requirement T-12.
- Roles: `usuario` (alumno, via public register, → `/panel`) and `superusuario` (docente/Jefe de Taller, **only** via `db:seed`, → `/admin`). `/panel` = catalog + filters + detail; `/admin` = dashboard, CRUD inventario, gestión de usuarios (guards: can't delete own account nor demote/delete the last `superusuario`).
- `/institucional` and `/contacto` are public (no auth). POST `/contacto` stores a `contactos` row. `admin` router uses `router.use(requireAuth, requireSuperusuario)` scoped by mounting at `/admin` — do NOT add un-scoped `router.use` that would shadow public routes.
- Item photos: `multer` → `public/uploads/items/` (5 MB, allowlist JPG/PNG/WEBP/GIF), gitignored; `item-form.ejs` keeps a hidden `foto` input preserving the current photo on edit.
- The Figma export (React/Vite/Tailwind) in `Figma/` uses `figma:asset/` imports and a `figmaAssetResolver` in its vite config — irrelevant to `tic-y-stock`; don't port those.

## Future stages (from spec, for planning only)

F4 consulta stock → F5 movimientos → F6 escaneo códigos/QR (`html5-qrcode`/QuaggaJS) → F7 alertas → F8 reservas/solicitudes. F3 (CRUD inventario), F9 (panel admin) and F10 (institucional/contacto) are done in Sprints 3-5; remaining backlog tasks T-28…T-46 and more are in the spec. Sprint order and tasks T-16…T-53 in the spec.