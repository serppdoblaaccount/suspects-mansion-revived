# Suspects: Mansion Revived

Juego fan-made para navegador inspirado en los juegos de misterio social.

## Estado del proyecto

- **Demo 0.1:** juego individual en `index.html`, con mapa, movimiento, tres pistas y temporizador.
- **Base 0.2:** núcleo de salas privadas en memoria, separado del transporte de red y cubierto por pruebas automatizadas.
- **Cuentas online:** API preparada para Supabase y Vercel; necesita configurar las variables de entorno y ejecutar el SQL.
- **Admin Panel:** lista cuentas online y permite bloquear/desbloquear jugadores. El servidor verifica el ID administrador.

## Estructura

- `index.html` — demo web individual actual.
- `src/room-manager.mjs` — lógica de crear, entrar, salir y comenzar salas.
- `test/room-manager.test.mjs` — pruebas del ciclo de vida de las salas.
- `docs/multiplayer-architecture.md` — propuesta de arquitectura, eventos y próximos pasos.

## Configurar cuentas online\n\nSigue `docs/online-accounts-setup.md`. Hasta configurar Supabase y las variables de Vercel, el registro online no funcionará.\n\n## Ejecutar las pruebas

Requiere Node.js 20 o superior. No hay dependencias externas:

```bash
npm test
```

## Jugar la demo

Abre `index.html` en un navegador. Si GitHub Pages está activado, la URL prevista es:

`https://serppdoblaaccount.github.io/suspects-mansion-revived/`

## Próximas fases

1. Añadir un servidor Socket.IO que use el núcleo de salas.
2. Crear una identidad de sesión y reconexión segura.
3. Sincronizar el estado de la partida desde el servidor.
4. Conectar una pantalla de crear/unirse a salas desde el navegador.
5. Desplegar el backend y probar una partida entre dos navegadores.

**Aviso:** las salas añadidas en esta fase solo son lógica local de servidor y no permiten todavía jugar online. Este es un proyecto fan-made, no un producto oficial de Suspects: Mystery Mansion.
