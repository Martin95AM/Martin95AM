# Registro temporal en Drive

1. Creá un proyecto en [Google Apps Script](https://script.google.com/), pegá `Code.gs` y desplegalo como **Web app**: ejecutar como tu cuenta; acceso: **Anyone**.
2. En **Project Settings → Script properties**, creá `DRIVE_SYNC_TOKEN` con una clave aleatoria larga. No la pongas en el frontend.
3. Guardá la URL `/exec` del despliegue en `DRIVE_STAGING_URL` en la máquina local. Guardá el mismo secreto en `DRIVE_SYNC_TOKEN`.
4. Configurá `window.MARTINQUEST_STAGING_URL` en el sitio publicado con esa URL. Cuando el backend local no responda, el sitio guarda el pedido allí.

Al arrancar el backend, el sincronizador consulta los pendientes, los registra en la base local y confirma el borrado en Drive. Los registros solo se eliminan después de esa confirmación.
