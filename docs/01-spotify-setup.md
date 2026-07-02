# Paso 1 — Registrar la app en Spotify Developer Dashboard

> **Cambio de política (febrero 2026):** crear una app en Development Mode
> ahora requiere una cuenta de **Spotify Premium**. Con cuenta gratuita el
> botón *Create app* no aparece. Además: máximo **1 Client ID por
> desarrollador** y **5 usuarios de prueba** por app.
> Fuente: https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security

## Registro (manual, ~5 minutos)

1. Entra en https://developer.spotify.com/dashboard con tu cuenta de Spotify
   **Premium** y acepta los términos de desarrollador si es la primera vez.
2. Pulsa **Create app** y rellena:
   - **App name:** `SameSpot`
   - **App description:** Red social musical — comparte lo que escuchas y
     descubre gente con gustos parecidos.
   - **Redirect URIs:** `http://127.0.0.1:5000/api/auth/spotify/callback`
   - **Which API/SDKs are you planning to use?:** marca **Web API**
3. Guarda y entra en **Settings** de la app: ahí están el **Client ID** y el
   **Client Secret** (botón *View client secret*). Los copiaremos al `.env`
   en el paso 2 — **nunca** se suben al repo.

### Ojo con el Redirect URI

- Spotify exige HTTPS en los redirect URIs, con una excepción: la IP de
  loopback **explícita** (`http://127.0.0.1:...`). Escribir `localhost` no
  está permitido, así que en desarrollo usaremos siempre `127.0.0.1`.
- El URI registrado debe coincidir **carácter a carácter** con el que envíe
  nuestra API en el flujo OAuth. Si en el paso 2 el puerto de la API acaba
  siendo otro, se edita aquí en Settings y listo.
- Cuando hagamos el deploy (paso 10) añadiremos un segundo URI con el
  dominio real en HTTPS.

### Modo desarrollo (limitación importante)

Las apps nuevas de Spotify nacen en **Development Mode** con las reglas de
febrero 2026: solo pueden usarla hasta **5 usuarios**, y hay que añadirlos
a mano en **Settings → User Management** (nombre + email de su cuenta de
Spotify). Para un portfolio da justo — añade tu cuenta y reserva los otros
huecos para quien vaya a probar la demo (p. ej. un entrevistador). Esta
limitación merece mención en el README como decisión consciente.

### Endpoints que usa el MVP (verificados tras los recortes de feb. 2026)

Spotify eliminó varios endpoints en Development Mode, pero todos los que
necesita el MVP siguen soportados:

- `GET /me` — perfil propio (display name, avatar). Ya **no** devuelve
  email, país ni tipo de cuenta.
- `GET /me/top/artists` y `GET /me/top/tracks` — tops del usuario (los
  artistas incluyen sus géneros).
- `GET /me/player/currently-playing` — now playing.

Eliminados que nos afectan de refilón: `GET /users/{id}` (perfil público de
otros usuarios) ya no existe — no importa, cada usuario importa sus datos
con su propio token y los servimos desde nuestra BD. "Get Several Artists"
(batch) tampoco existe; si hiciera falta, `GET /artists/{id}` de uno en uno.

## Scopes que pedirá la app

Los permisos que el usuario aceptará en la pantalla de login, mínimos para
el MVP:

| Scope | Para qué |
|---|---|
| `user-read-private` | Perfil básico (display name, avatar) |
| `user-top-read` | Top tracks y top artistas |
| `user-read-currently-playing` | Now playing |

(`user-read-email` ya no aporta nada: desde feb. 2026 la API no devuelve el
email. Identificaremos a los usuarios por su `spotifyId`.)

## Variables de entorno

Definidas en `.env.example` (raíz del proyecto). Para desarrollo se copia a
`.env` y se rellena; `.env` irá en el `.gitignore` desde el paso 2.

| Variable | Descripción |
|---|---|
| `SPOTIFY_CLIENT_ID` | Client ID de la app (Dashboard → Settings) |
| `SPOTIFY_CLIENT_SECRET` | Client Secret. Secreto: solo vive en el backend |
| `SPOTIFY_REDIRECT_URI` | Debe coincidir exactamente con el registrado |
| `JWT_SECRET` | Clave para firmar nuestros JWT (mín. 32 caracteres aleatorios) |
| `JWT_ISSUER` | Emisor del JWT (`samespot-api`) |
| `JWT_AUDIENCE` | Audiencia del JWT (`samespot-web`) |

La cadena de conexión a PostgreSQL se añadirá en el paso 2 junto con el
Docker Compose.

## Checklist antes de pasar al paso 2

- [ ] Cuenta de Spotify **Premium** disponible
- [ ] App creada en el Dashboard con el redirect URI de arriba
- [ ] Client ID y Client Secret localizados (aún no hace falta copiarlos)
- [ ] Tu cuenta añadida en User Management
