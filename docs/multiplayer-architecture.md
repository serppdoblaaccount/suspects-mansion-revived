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

1. **Transporte:** servicio Node.js persistente con Socket.IO y WSS. El navegador puede seguir alojado como web estática; el servidor de sockets se despliega por separado en un host que mantenga conexiones WebSocket.
2. **Identidad:** el cliente presenta el token de cuenta en el handshake. El servidor lo valida con la misma clave HMAC y obtiene el ID desde el token; nunca acepta un `playerId` enviado por el cliente. En el handshake también debe comprobar que la cuenta sigue activa/no bloqueada.
3. **Salas privadas:** el servidor genera códigos de seis caracteres con `crypto`, limita la sala a 8 jugadores por defecto, comprueba cada entrada y elimina salas caducadas. El host puede iniciar cuando haya al menos dos jugadores conectados.
4. **Desconexión:** conservar al jugador durante 30 segundos para permitir reconexión; después retirarlo y transferir el host al primer jugador conectado. El servidor entrega una instantánea al reconectar.
5. **Sincronización:** el servidor es la autoridad del estado. Cada cambio incrementa `revision`; el cliente solo aplica revisiones más nuevas. Los clientes envían acciones, no estados finales, roles, votos contados ni temporizadores. El servidor valida fase, pertenencia, permisos y límites antes de difundir el nuevo estado.

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

Las diez pruebas de `test/room-manager.test.mjs` cubren creación, entrada, límites, inicio, salida, caducidad, reconexión, expiración de reconexión y revisiones. Ejecutar con Node.js 20 o superior:

```bash
npm test
```

## Lo que falta antes de jugar online

- instalar y configurar Socket.IO en un servidor persistente;
- conectar el handshake con los tokens de cuenta y comprobar el estado de bloqueo;
- guardar o coordinar salas si se ejecuta más de una instancia del servidor;
- implementar el estado autoritativo de la partida (personajes, roles, pistas, reuniones, votos y victoria);
- conectar la maqueta de sala de `index.html` al endpoint WSS;
- configurar la URL pública del servidor y probar dos navegadores/dispositivos.

El núcleo actual es una base local de servidor y **no crea salas online por sí solo**. No se han añadido claves, tokens ni endpoints ficticios.
