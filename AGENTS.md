# AGENTS.md

School project (Proyecto Integrador III, Escuela Técnica N°20, Buenos Aires, 2026): "TIC & Stock", a stock/inventory web app for the TIC workshop with barcode check-out. UI copy and docs are in **Spanish** — keep new UI text in Spanish (but see the ASCII gotcha below).

## Repo layout

- `Proyecto Integrador III - 6°2° - 2026(1).md` — assignment spec **and source of truth for architecture and requirements** (diagnóstico, alcance, PMV, Product Backlog T-01…T-53, Sprint plan, Actividad 24 = architecture decision). Read it before changing features.
- `tic-y-stock/` — **the active codebase** (stage 1: login + register, Sprint 2 / T-08–T-15). Work here.
- `Figma/` — Figma Make export of the UI prototype. **Visual reference ONLY** (colors, layout). Do NOT copy its React/Vite architecture — the team explicitly rejected it.
- `AGENTS.md` — this file.

## Architecture (Actividad 24 in the spec — do not deviate)

Monolithic 3-layer app: **Node.js + Express** (routes → controllers → middleware), **MySQL** (`mysql2` pool), **EJS** views, **express-session + bcrypt** auth. Structure in `tic-y-stock/`: `routes/`, `controllers/`, `middleware/`, `models/` (db.js + user.model.js), `views/` (EJS), `public/` (css/js), `db/schema.sql`, `scripts/`.

## Commands (in `tic-y-stock/`)

- `npm install` · `npm start` (node server.js) · `npm run dev` (nodemon)
- `npm run db:seed` — creates the initial `superusuario` account (env: `SEED_NOMBRE`, `SEED_EMAIL`, `SEED_CONTRASEÑA`; defaults `docente@ticystock.ar` / `docente123`)
- DB setup: `mysql -u root < db/schema.sql` (DB `tic_stock`, table `usuarios`)
- **No lint, typecheck, or test scripts.** Verify with manual flow: start server, `curl.exe` against `/login`, `/register`, `/panel`, `/admin`.
- Windows gotcha: PowerShell blocks `npm`/`npx` `.ps1` shims → use `npm.cmd` / `npx.cmd` (and `cmd /c` for `mysql < file` redirection).

## Gotchas

- **No accented identifiers.** Windows MySQL client mangles UTF-8 accents (table/column names AND form field names must be ASCII: `contrasena_hasheada`, `confirmar_contrasena`). Spanish is fine in UI text and error messages, not in identifiers/fields.
- `.env` supported (`PORT`, `DB_*`, `SESSION_SECRET`, `SEED_*`); defaults target XAMPP MySQL (root, no password) and `0.0.0.0:3000` (school LAN access).
- Session: cookie `ticstock.sid`, httpOnly, 30 min inactivity expiry (rolling) — requirement T-12.
- Roles: `usuario` (alumno, via public register) and `superusuario` (docente/Jefe de Taller, **only** via `db:seed` — no public superuser registration). After login: `/panel` (usuario) vs `/admin` (superusuario); both are "en construcción" placeholders until later Sprints.
- The Figma export (React/Vite/Tailwind) in `Figma/` uses `figma:asset/` imports and a `figmaAssetResolver` in its vite config — irrelevant to `tic-y-stock`; don't port those.

## Future stages (from spec, for planning only)

F3 CRUD inventario → F4 consulta stock → F5 movimientos → F6 escaneo códigos/QR (`html5-qrcode`/QuaggaJS) → F7 alertas → F8 reservas/solicitudes → F9 panel admin → F10 institucional. Sprint order and tasks T-16…T-53 in the spec.