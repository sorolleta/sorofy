# Sorofy

Red social musical *slow*: compartes lo que escuchas con contexto, no con ruido.
Te conectas con tu cuenta de Spotify y la app importa tus artistas y canciones
favoritas para encontrarte gente con gustos parecidos.

## Qué se puede hacer

- **Notas** — escribe por qué te importa una canción o un disco, con enlace para escucharlo.
- **Feed** — notas de la gente a la que sigues, con likes y comentarios.
- **Gente** — descubre perfiles con gustos parecidos a los tuyos.
- **Perfil y trío** — tus tops de Spotify y las tres canciones que te definen.
- **Grupos locales** — bandas y proyectos de tu provincia: seguidores, fotos, vídeos y repertorio.
- **Listas** — estanterías hechas a mano, con un "porqué" en cada canción.
- **Ecos** — el rastro de lo que tus notas han movido.
- **Chats** — mensajes en tiempo real.

## Tecnología

| Parte | Stack |
|---|---|
| Backend | .NET 8 (ASP.NET Core Web API), Entity Framework Core, SignalR, JWT |
| Base de datos | PostgreSQL 16 |
| Frontend | React 19 + TypeScript + Vite, React Router |
| Login | Spotify OAuth |
| Infra local | Docker Compose |

```
backend/    API en .NET (controladores, repositorios, migraciones, tests)
frontend/   App web en React
docs/       Guías de configuración
```

## Cómo arrancarlo en local

Necesitas Docker, Node 20+ y una app registrada en Spotify
(ver [docs/01-spotify-setup.md](docs/01-spotify-setup.md)).

1. Copia `.env.example` a `.env` y rellena las claves de Spotify y un `JWT_SECRET`.
2. Levanta la base de datos y la API:
   ```bash
   docker compose up --build
   ```
   La API queda en `http://127.0.0.1:5000`.
3. Arranca el frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Abre `http://localhost:5173`.

## Nota sobre Spotify

Las apps de Spotify en modo desarrollo solo admiten 5 usuarios de prueba
añadidos a mano. Si quieres probar la app, pídeme que te añada.
