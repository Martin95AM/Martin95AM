# Asistente conversacional

La interfaz de `frontend/src/ui/AssistantPanel.js` envía mensajes a `POST /api/assistant/chat`. El servidor Spring mantiene hasta 12 turnos por sesión durante 30 minutos y llama a la Responses API de OpenAI. El navegador recibe solo el texto y un identificador aleatorio de sesión; nunca recibe la clave.

## Configuración local

El servidor necesita `OPENAI_API_KEY` en su entorno. El archivo `.env.local` del repositorio no se carga automáticamente en Java. Las demás opciones son:

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `OPENAI_MODEL` | `gpt-5.4-mini` | Modelo de texto |
| `OPENAI_API_URL` | `https://api.openai.com/v1/responses` | Solo para pruebas con un servidor simulado |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido del frontend |
| `VITE_ASSISTANT_API_URL` | `http://localhost:8080` solo en desarrollo | URL pública del backend para Vite |

El perfil autorizado está en `src/main/resources/assistant-profile.txt`. Para que el backend existente arranque fuera de la máquina de desarrollo, también hay que configurar su base de datos y las demás variables que utilicen las funciones de correo.

Hay límites por proceso: 30 mensajes por IP por hora, 200 mensajes globales por día y 12 por sesión. Un reinicio del servidor restablece los contadores; para una exposición pública sostenida conviene un límite compartido y un presupuesto de API en la cuenta de OpenAI.

## Publicación

GitHub Pages solo sirve archivos estáticos. El controlador Java necesita un servidor HTTPS aparte. Una vez elegido y desplegado, configurar en ese servidor `OPENAI_API_KEY` como secreto y `CORS_ORIGIN=https://martin95am.github.io`. Luego añadir en GitHub Actions la variable de repositorio `ASSISTANT_API_URL` con la URL pública del servidor; el workflow la incorpora al build como `VITE_ASSISTANT_API_URL`.

No configurar la URL de OpenAI como `ASSISTANT_API_URL`: esa variable debe apuntar al backend propio. Tampoco colocar `OPENAI_API_KEY` en variables `VITE_*`, JavaScript del frontend, GitHub Pages ni archivos versionados.

## Verificación

`AssistantControllerSmokeTest` usa una API local simulada y comprueba cinco turnos consecutivos, el historial enviado al modelo, la ausencia de almacenamiento remoto (`store: false`), el filtro de datos privados, la validación de entrada y el error por falta de clave. La prueba `live` utiliza la cuenta real y requiere crédito disponible; no se ejecuta automáticamente.
