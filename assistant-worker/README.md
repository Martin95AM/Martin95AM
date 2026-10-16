# Asistente gratuito del currículum

El sitio sigue alojado en GitHub Pages. Un Cloudflare Worker separado recibe los mensajes y usa Workers AI mediante un binding: no hay clave de OpenAI ni secretos en el navegador. Cloudflare Workers AI ofrece 10.000 neurons gratis por día en el plan Workers Free; al agotar la cuota, las solicitudes fallan en vez de generar cargos por excedente. Las cuotas y el catálogo pueden cambiar: revisar la [página oficial de precios](https://developers.cloudflare.com/workers-ai/platform/pricing/) antes de activarlo.

Se usa `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. El Worker envía siempre el perfil público aprobado como contexto. El navegador conserva los últimos cinco intercambios solo durante la pestaña abierta; “Nueva charla” los borra. No se almacena una conversación en el servidor. El límite del Worker es de 6 consultas por IP y 30 consultas para el sitio por minuto, por ubicación de Cloudflare. No es una garantía contra abuso distribuido; la cuota diaria gratuita es el tope externo. El texto del visitante llega a Cloudflare para generar la respuesta. No escribir información sensible en el chat.

## Probar sin usar la cuota

Desde la raíz del repositorio: `node --test assistant-worker/src/index.test.js`. Las pruebas simulan Workers AI y comprueban contexto, validación, origen y errores. No demuestran la calidad de una respuesta real del modelo.

## Publicación

1. Confirmar que la cuenta de Cloudflare siga en el plan Workers **Free**. No cambiarla a Paid si el objetivo es costo cero.
2. Desde `assistant-worker/`, ejecutar `npm ci`, `npx wrangler login` si hace falta y `npm run deploy`. El Worker existente se publica en `https://martin95am-assistant.martinarias95.workers.dev`. Las pruebas locales `wrangler dev` también utilizan la cuota de Workers AI.
3. El frontend de producción usa esa URL pública por defecto. La variable opcional `ASSISTANT_API_URL` de GitHub Actions permite cambiarla sin editar código. Enviar un commit a `main` para recompilar GitHub Pages.
4. Probar en la página publicada: saludo, charla cotidiana, “quién sos”, “contame sobre él”, “sus habilidades” y pregunta repetida. Comprobar que responde con datos aprobados y que “Nueva charla” empieza sin contexto.

No usar la antigua `OPENAI_API_KEY` para este Worker; el archivo local `.env.local` se deja intacto y está ignorado por Git.
