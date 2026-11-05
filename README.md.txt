# 🍽️ Calorie Camera

App de prueba: toma una foto de un plato de comida y estima las calorías usando Workers AI (modelo de visión multimodal).

## Cómo funciona
- Un único Cloudflare Worker sirve:
  - `/` → página web móvil (HTML) para tomar/subir la foto.
  - `/analyze` (POST) → recibe la imagen en base64, la envía al modelo de visión y devuelve un JSON con los alimentos, calorías por ítem y total.
  - `/history` (GET) → historial de análisis (requiere D1).
  - `/photo/:key` (GET) → sirve la foto guardada (requiere R2).

## Requisitos
- Cuenta de Cloudflare con Workers AI habilitado (binding `AI`).

## Desarrollo local
npm install
npx wrangler dev

## Despliegue
npx wrangler deploy

## Notas
- Las estimaciones son aproximadas (la IA no pesa los alimentos). Úsalo como guía.
- El modelo de visión puede cambiarse en `src/index.js`.
