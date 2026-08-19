# Hotfix Protocol — Post-MVP (Vacaciones)

> **Contexto:** El MVP se entrega el 20 de julio. Las vacaciones del equipo son del 20 al 31 de julio.
> **On-call durante vacaciones:** [Tu nombre] + Juan.
> **Backend (Tobias):** Disponible solo para emergencias mayores vía WhatsApp.

---

## 1. ¿Qué es un bug crítico (hotfix candidate)?

Solo se hotfixea si cumple **TODAS** estas condiciones:

| Criterio | Ejemplo |
|----------|---------|
| 🛑 Bloquea el flujo principal del usuario | No se puede registrar, loguear, o iniciar una consulta |
| 🛑 No tiene workaround | No hay forma de evitar el bug desde la UI |
| 🛑 Afecta a TODOS los usuarios | No es un caso edge raro |

**NO son hotfix:** errores de tipeo, colores, textos, casos edge de especies exóticas, features que faltan.

---

## 2. Proceso de hotfix (20-31 jul)

```
1. DETECTAR ─→ 2. EVALUAR ─→ 3. FIX ─→ 4. DEPLOY
```

### Paso 1: Detectar
Alguien reporta un bug. Puede ser un profesor, un usuario de prueba, o ustedes mismos.

### Paso 2: Evaluar (vos + Juan, máx 30 min)
¿Es crítico según la tabla de arriba?
- **SÍ** → seguir al paso 3
- **NO** → registrar en Trello/Notion como bug post-vacaciones (columna "Backlog S11")

### Paso 3: Fix (quien esté on-call)
```bash
git checkout main
git pull
git checkout -b hotfix/<descripcion-corta>
# Hacer el fix
git add .
git commit -m "hotfix: <descripción>"
git push origin hotfix/<descripcion-corta>
```
Crear PR directo a `main` (saltar `develop` — es emergencia).

### Paso 4: Deploy
Si el remote funciona:
```bash
git checkout main
git pull
git merge hotfix/<descripcion-corta>
git push origin main
```
Railway depliega automáticamente si está conectado. Verificar con:
```bash
curl https://conectavet-api.up.railway.app/health
```

---

## 3. Si el fix es de backend y Tobias no está

Los endpoints ya funcionan (auth, pets, users). Si el bug es de backend:
1. Intentar diagnosticar: revisar logs del server, ver qué responde el endpoint
2. Si es un error de validación o datos, se puede corregir desde la base de datos (Supabase dashboard → Table Editor)
3. Si requiere cambiar código → llamar a Tobias por WhatsApp. Si no responde en 2h, documentar el bug y esperar a que termine vacaciones

---

## 4. Si el fix es de mobile

Juan compila un nuevo APK con Expo:
```bash
cd mobile
npx expo build:android
```
Subir el APK a un drive compartido y avisar al equipo.

---

## 5. Escalamiento

| Gravedad | Respuesta | Quién |
|----------|-----------|-------|
| 🔴 Bloqueante total (nadie puede usar la app) | Responder en < 4h | Vos o Juan |
| 🟡 Bug molesto pero hay workaround | Reportar en Trello, fix post-vacaciones | - |
| 🟢 Bug cosmético / texto | Reportar en Trello, fix post-vacaciones | - |

---

## 6. Post-vacaciones (S11 — 3 de agosto)

Durante la daily de reactivación (S11):
1. Revisar todos los bugs reportados en vacaciones
2. Priorizar con el equipo
3. Asignar a los sprints correspondientes
