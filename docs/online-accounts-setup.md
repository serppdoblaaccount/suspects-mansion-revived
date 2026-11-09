# Cuentas online y administración

## 1. Base de datos
1. Crea un proyecto en Supabase.
2. Abre SQL Editor y ejecuta `supabase/schema.sql`.
3. En Project Settings > API copia Project URL y la clave **service_role**. No compartas esta clave ni la pongas en el navegador.

## 2. Variables de entorno en Vercel
Añade estas variables para Production (y Preview si quieres probar):
- `SUPABASE_URL`: URL del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY`: clave service_role, solo servidor.
- `AUTH_TOKEN_SECRET`: cadena aleatoria larga y privada (mínimo 32 caracteres).
- `ADMIN_USER_ID`: `SMR-FAC1C675-EF34-4222-82CB-2B793990D78F`.
- `ADMIN_SETUP_TOKEN`: otra cadena privada, temporal, para crear la cuenta administradora inicial.

Después de guardar las variables, redepliega el proyecto.

## 3. Crear la cuenta administradora
La primera cuenta debe registrarse mediante la acción `bootstrap` de `/api/auth`, usando el `ADMIN_SETUP_TOKEN` y el ID fijado en `ADMIN_USER_ID`. El cliente del juego debe enviar el nombre, la sal y el hash PBKDF2 de la contraseña. Una vez creada, elimina `ADMIN_SETUP_TOKEN` de Vercel y vuelve a desplegar.

## Seguridad
- La clave service_role nunca se envía al navegador.
- La API firma sesiones y comprueba el ID de administrador en el servidor.
- El panel solo permite listar cuentas y bloquear/desbloquear jugadores.
- Las contraseñas no se guardan en texto claro.
- No reutilices contraseñas de otras cuentas.
