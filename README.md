# Aslan Fast Food · Pedidos (Next.js + Supabase)

Menú web para clientes (`/`) y panel de cocina/POS (`/panel`), sincronizados en tiempo real.

## Puesta en marcha

1. **Crear proyecto** en https://supabase.com (plan gratis sirve para empezar).
2. **Base de datos:** Supabase → SQL Editor → pega todo `supabase/schema.sql` → Run.
3. **Personal:** Authentication → Users → *Add user* (correo + contraseña para el restaurante).
   Luego Authentication → Sign In / Providers → desactiva **Allow new users to sign up**
   (si no, cualquiera podría registrarse y entrar al panel).
4. **Llaves:** Project Settings → API → copia *Project URL* y *anon public key*.
   Copia `.env.local.example` a `.env.local` y pega los valores.
5. **Probar en tu computador:**
   ```
   npm install
   npm run dev
   ```
   Cliente: http://localhost:3000 · Panel: http://localhost:3000/panel
6. **Publicar:** sube la carpeta a GitHub → https://vercel.com → *Import project* →
   agrega las dos variables de entorno → Deploy.
7. **QR de mesa:** genera un QR con la URL de Vercel (o `?mesa=N` si luego lo agregas).

## Seguridad (ya incluida)
- El público solo puede leer el menú; no puede leer ni modificar pedidos.
- Los pedidos se crean con `create_order`, que **calcula el precio en el servidor**.
- El cliente ve solo su pedido (UUID) y solo puede cancelar si sigue en `NUEVO`.
- `/panel` exige usuario y contraseña de Supabase; los datos del panel están protegidos por RLS.

## Pendiente para la siguiente etapa
- WhatsApp automático al cliente (Twilio / WhatsApp Cloud API) con una Edge Function
  disparada por un Database Webhook en `orders`.
- Pasarela de pagos (Wompi / Mercado Pago) para pagos con tarjeta o PSE.
- Subir fotos de productos a Supabase Storage y poner la URL en `products.image_url`.
- Cambiar precios y descripciones reales en la tabla `products`.
