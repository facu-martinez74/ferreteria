# Ferretería El Clavo · informe técnico breve

**Problema:** un negocio local pierde ventas porque atiende pedidos a mano (WhatsApp/teléfono). **Solución:** tienda web + asistente de IA que entiende el *trabajo* del cliente, arma la lista con precios y stock real y crea el pedido, más un panel de administración.

## Componentes
| Componente | Qué hace | Archivos |
|---|---|---|
| Sitio / tienda | Catálogo, búsqueda, carrito, retiro o envío, pago efectivo/transferencia, seguimiento, PWA | `public/index.html`, `app.js`, `tienda.css`, `seguimiento.*` |
| Cuentas de clientes | Registro/login, datos guardados, "Mis pedidos", repetir pedido | `clientes.js`, endpoints `/api/auth/*` |
| Asistente IA (central) | Function calling (OpenAI): `buscar_productos`, `verificar_stock`, `calcular_cantidades`, `mostrar_lista`, `crear_pedido`. Precios y stock siempre desde la base; pide confirmación; usa los datos de la cuenta | `assistant.js`, `public/chat.js` |
| Panel admin (CRM del negocio) | KPIs, pedidos y estados, aviso por WhatsApp, inventario editable con alerta de stock, estadísticas, conversaciones de la IA vinculadas al pedido | `public/admin.*`, `/api/admin/*` |
| Datos | SQLite (`node:sqlite`): productos, pedidos, items, clientes, sesiones, conversaciones. Stock descontado en transacción; cancelar lo devuelve | `db.js`, `conversaciones.js` |
| Servidor | Node sin dependencias, PM2, nginx + https. Límites de uso, bloqueo por intentos, CSP | `server.js` |

## Seguridad
API key solo en `.env` del servidor (fuera de git). Contraseñas con scrypt + sal; sesiones por token hasheado. Límites por IP/día/hora para proteger la key compartida. Costo de envío calculado en el servidor.

## Alcance honesto
Sin pasarela de pago real (efectivo o transferencia con confirmación del local). Fotos de Wikimedia Commons (créditos en `/creditos.html`).
