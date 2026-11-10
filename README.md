# Suspects: Mansion Revived

Juego fan-made para navegador inspirado en los juegos de misterio social.

## Estado del proyecto

- **Demo 0.1:** demo individual original conservada en `demo-0.1.html`.
- **Menú actual:** `index.html`, con selección de personajes, acceso a cuentas y una maqueta de salas todavía sin conexión.
- **Cuentas online:** API implementada en `api/auth.js` y `api/admin.js`, respaldada por Supabase. Requiere ejecutar `supabase/schema.sql` y configurar las variables privadas indicadas en `.env.example`.
- **Base multijugador:** `src/room-manager.mjs` gestiona salas privadas en memoria, códigos, capacidad, host, reconexión temporal y revisiones de estado.
- **Multijugador real:** todavía no disponible. No hay servidor Socket.IO/WSS conectado al navegador.

## Estructura principal

- `index.html` — menú y pantallas actuales.
- `demo-0.1.html` — demo local original.
- `api/auth.js` — registro, inicio de sesión y configuración inicial de admin.
- `api/admin.js` — API del panel de administración.
- `supabase/schema.sql` — esquema de cuentas.
- `src/room-manager.mjs` — núcleo de salas independiente del transporte.
- `test/room-manager.test.mjs` — pruebas automatizadas del núcleo de salas.
- `docs/online-accounts-setup.md` — configuración de Supabase y Vercel.
- `docs/multiplayer-architecture.md` — propuesta de salas y sincronización en tiempo real.

## Ejecutar las pruebas

Requiere Node.js 20 o superior. El núcleo de salas no necesita dependencias externas:

```bash
npm test
```

## Configurar cuentas online

Sigue `docs/online-accounts-setup.md`. Hasta ejecutar el SQL y añadir las variables de entorno privadas en el despliegue, el registro y el inicio de sesión online no funcionarán. No subas un archivo `.env` ni claves privadas a GitHub.

## Probar el juego

Abre `index.html` para ver el menú actual. Para jugar la demo individual original, abre `demo-0.1.html`.

## Próximos pasos

1. Crear el endpoint WebSocket de Vercel y coordinar las salas entre instancias con Redis/pub-sub.
2. Validar tokens de cuenta en el handshake y derivar la identidad desde el token.
3. Implementar y probar el estado autoritativo de cada partida.
4. Conectar la pantalla de sala del navegador y sincronizar instantáneas por revisión.
5. Desplegar el servidor WSS y probar una partida entre dos dispositivos.

**Aviso:** proyecto fan-made no oficial de Suspects: Mystery Mansion. La lógica de salas actual es local al proceso y no permite todavía jugar online.
