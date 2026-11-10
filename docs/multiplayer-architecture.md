# Salas privadas y sincronización multijugador

Estado revisado: 10 de noviembre de 2026.

## Punto de partida real

- `demo-0.1.html` conserva la demo local jugable original.
- `index.html` contiene el menú actual, el acceso a cuentas y una maqueta de sala. Sus botones de crear/unirse indican expresamente que no hay servidor conectado.
- `api/auth.js` ya implementa registro, desafío de contraseña, inicio de sesión y configuración inicial de admin. Firma tokens HMAC con vencimiento de 14 días usando `AUTH_TOKEN_SECRET`.
- `api/admin.js` expone el panel protegido de administración.
- `supabase/schema.sql` define la tabla de jugadores. Las cuentas online solo funcionarán cuando se ejecute ese SQL y se configuren en Vercel las variables de `.env.example`; no hay credenciales reales guardadas en el repositorio.
- `src/room-manager.mjs` es un núcleo de salas en memoria, sin transporte de red. Esta fase añade reconexión temporal y revisiones de estado.

Por tanto, hay una API de cuentas, pero **todavía no hay backend multijugador en tiempo real**.

## Propuesta técnica breve

1. **Transporte en Vercel:** crear un endpoint WebSocket como Vercel Function dentro de `api/`. Vercel anunció que WebSockets en Functions son generalmente disponibles el 20-10-2026. Se puede usar `ws` o Socket.IO; con Socket.IO, el cliente debe usar `transports: ["websocket"]` y la ruta correspondiente de `/api/`.
2. **Estado compartido:** cada conexión queda fijada a una instancia y se cierra al alcanzar la duración máxima de la Function. Los clientes deben reconectar y pedir una instantánea. Como los jugadores de una misma sala pueden llegar a instancias distintas, usar Redis con pub/sub para presencia, salas y difusión de eventos; el `Map` de `RoomManager` no puede ser el almacenamiento compartido de producción.
3. **Identidad:** el cliente presenta el token de cuenta durante el handshake. El servidor valida la firma y caducidad con `AUTH_TOKEN_SECRET`, obtiene el ID desde el token y consulta que la cuenta siga activa/no bloqueada. Nunca acepta un `playerId` enviado libremente por el cliente.
4. **Salas privadas:** generar códigos de seis caracteres con `crypto`, limitar cada sala a 8 jugadores por defecto, validar cada entrada y caducar salas. Solo el host puede iniciar cuando haya al menos dos jugadores conectados.
5. **Desconexión:** conservar al jugador durante 30 segundos para permitir reconexión; después retirarlo y transferir el host al primer jugador conectado. La reconexión recupera una instantánea desde el estado compartido.
6. **Sincronización:** el servidor es la autoridad del estado. Cada cambio incrementa `revision`; el cliente solo aplica revisiones más nuevas. Los clientes envían acciones, no estados finales, roles, votos contados ni temporizadores. El servidor valida fase, pertenencia, permisos y límites antes de difundir el nuevo estado.

Vercel exige Fluid Compute para WebSockets. Sus conexiones pueden cerrarse por el límite de duración de la Function, y la documentación recomienda reconexión y almacenamiento externo/pub-sub para coordinar distintas instancias. Referencias: [anuncio de disponibilidad general de WebSockets (20-10-2026)](https://vercel.com/changelog/websocket-support-is-now-generally-available) y [guía de WebSockets en Vercel Functions](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections).
### Contrato de eventos propuesto

- Cliente → servidor: `room:create`, `room:join`, `room:leave`, `room:reconnect`, `game:action`, `meeting:vote`.
- Servidor → cliente: `room:created`, `room:state`, `room:error`, `game:state`, `meeting:results`.
- Los mensajes de estado incluyen `protocolVersion` y `revision`. Las instantáneas privadas solo se envían a miembros de esa sala; los roles ocultos se entregan individualmente.

## Implementado y verificable en esta fase

`RoomManager` ahora incluye:

- códigos privados aleatorios, capacidad y transferencia de host;
- desconexión y reconexión con una ventana predeterminada de 30 segundos;
- expulsión automática de conexiones cuya ventana expiró;
- bloqueo del inicio si el host está desconectado o quedan menos de dos jugadores conectados;
- un contador `revision` que aumenta cuando cambia el estado de la sala.

Las diez pruebas de `test/room-manager.test.mjs` cubren creación, entrada, límites, inicio, salida, caducidad, reconexión, expiración de reconexión, revisiones y normalización de nombres. Ejecutar con Node.js 20 o superior:

```bash
npm test
```

## Lo que falta antes de jugar online

- crear el endpoint WebSocket de Vercel, añadir `ws` o Socket.IO y comprobar que Fluid Compute está habilitado;
- conectar el handshake con los tokens de cuenta y comprobar el estado de bloqueo;
- configurar Redis con almacenamiento de salas y pub/sub para coordinar distintas instancias;
- implementar el estado autoritativo de la partida (personajes, roles, pistas, reuniones, votos y victoria);
- conectar la maqueta de sala de `index.html` al endpoint WSS y programar reconexión con espera progresiva e instantánea;
- probar el despliegue con dos navegadores/dispositivos y verificar el intercambio de eventos entre instancias.

El núcleo actual es una base local de servidor y **no crea salas online por sí solo**. No se han añadido claves, tokens ni endpoints ficticios.
