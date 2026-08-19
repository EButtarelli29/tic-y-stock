# Conexion Mobile sin Red Corporativa

En redes empresariales con subredes el celular no puede alcanzar la PC
directamente. Aca estan las 3 formas de evitarlo.

---

## 1. ADB Reverse (recomendado)

Usa el cable USB para redirigir los puertos del celular a la PC.
No necesita WiFi, no usa la red corporativa.

### En el celular (una sola vez)

1. Abri **Ajustes → Informacion del telefono**
2. Toca **"Numero de compilacion"** 7 veces hasta que aparezca
   _"Ahora eres desarrollador"_
3. Andá a **Ajustes → Opciones de desarrollador**
4. Activa **"Depuracion USB"**
5. Conecta el celular a la PC por cable USB
6. En la pantalla del celular acepta **"Permitir depuracion USB"**
   (marca "Recordar siempre")

### En la PC

```powershell
cd <ruta-del-repo>\mobile
.\start.ps1 -ADB
```

### Que hace exactamente

```
celular ──USB── PC
:8081  ──adb reverse──> :8081  (Expo Metro bundler)
:3001  ──adb reverse──> :3001  (Backend API)
```

- Expo arranca con `--localhost` (solo escucha en 127.0.0.1)
- `adb reverse tcp:8081 tcp:8081` redirige el puerto 8081 del celular a la PC
- `adb reverse tcp:3001 tcp:3001` redirige el puerto 3001 del celular a la PC
- El QR codifica `exp://127.0.0.1:8081`
- Cuando Expo Go escanea el QR, conecta a 127.0.0.1:8081
- ADB desvia ese trafico por USB hacia la PC
- La app carga el bundle y despues llama al backend en 127.0.0.1:3001
- ADB redirige tambien esa llamada por USB

### Requisitos

- ADB instalado. Opciones:
  - `winget install Google.PlatformTools` (si falla con error de hash, descargar manualmente de developer.android.com y descomprimir en `%LOCALAPPDATA%\Android\platform-tools`)
  - `start.ps1` lo busca en el PATH **y** en `%LOCALAPPDATA%\Android\platform-tools\adb.exe` automáticamente
- Si instaste adb, abrí un **terminal nuevo** para que el PATH actualizado surta efecto
- Cable USB funcional
- Android con depuracion USB activada

---

## 2. USB Tethering (compartir datos del celular)

El celular comparte su internet (datos moviles) a la PC por USB.
Ambos quedan en la misma red.

### En el celular

1. Conecta el celular a la PC por cable USB
2. Andá a **Ajustes → Redes → Anclaje / Zona WiFi → Anclaje USB**
3. Activalo

### En la PC

```powershell
cd <ruta-del-repo>\mobile
.\start.ps1
```

### Que hace exactamente

```
       DATOS MOVILES
celular ──USB── PC
 IP: 192.168.42.1    IP: 192.168.42.xxx
```

- El celular asigna a la PC una IP tipo `192.168.42.xxx`
- El script detecta esta IP automaticamente (prioridad sobre LAN)
- Expo arranca en modo LAN escuchando en esa IP
- El QR codifica `exp://192.168.42.xxx:8081`
- El celular (que esta en 192.168.42.1) puede ver la PC
- Expo Go escanea y conecta por USB

### Requisitos

- Cable USB
- Datos moviles activados en el celular
- No usa la red WiFi corporativa

---

## 3. Tunnel (ngrok) — sin USB

Usa ngrok para crear un tunel publico. El QR tendra una URL
accesible desde cualquier red. No necesita cable.

### En la PC

```powershell
cd <ruta-del-repo>\mobile
.\start.ps1 -Tunnel
```

### Que hace exactamente

```
celular ──internet── ngrok ──internet── PC
                         :8081
```

- Expo arranca con `--tunnel`, que usa ngrok
- ngrok crea una URL publica tipo `https://abc123.ngrok.io`
- Esa URL redirige al puerto 8081 de la PC
- El QR codifica esa URL publica
- El celular escanea y se conecta via internet a ngrok
- ngrok reenvia a la PC

### Limitacion

El backend (`http://10.20.31.123:3001`) sigue en la red corporativa.
Para que la app funcione completa, tambien hay que tunelar el backend:

```powershell
# En otra terminal
npx @expo/ngrok http 3001
```

Luego copiar la URL que genera (ej: `https://def456.ngrok.io`)
y actualizarla en `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://def456.ngrok.io
EXPO_PUBLIC_WS_URL=wss://def456.ngrok.io
```

> 📌 `WS_URL` conecta a la raíz del servidor Socket.IO (`/socket.io`), **no** a `/ws/queue` (path fantasma).

Despues reiniciar Expo.

> **Flag util:** `start.ps1 -Fast` corre Metro con `--no-dev --minify` (bundle mucho mas rapido para demos).

### Requisitos

- Internet en PC y celular
- Puerto 443 de salida abierto (puede estar bloqueado en empresas)
- ngrok puede estar bloqueado por el firewall corporativo

---

## Resumen

| Metodo | Cable | WiFi | Red Corp. | Internet | Facilidad |
|--------|-------|------|-----------|----------|-----------|
| ADB Reverse | Si | No | No | No | Alta |
| USB Tethering | Si | No | No | Si (datos) | Media |
| Tunnel (ngrok) | No | Si* | No | Si | Baja |

\* Tunnel necesita internet, pero no la WiFi corporativa (puede ser
datos moviles del celular mientras ngrok corre en la PC con internet
corporativa).
