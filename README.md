# Ferretería El Clavo — catálogo + asistente de pedidos con IA

Hackatón "Del problema al servidor" · DonWeb Day Rosario.

## El problema
Una ferretería local atiende consultas y pedidos a mano, por WhatsApp o teléfono: mensajes que se pierden, pedidos mal anotados, clientes que esperan y se van. Además, el cliente casi nunca sabe **qué** necesita: sabe qué *trabajo* quiere hacer.

## La solución
- **Tienda web** con catálogo, stock real, búsqueda por producto o por uso, carrito y pedido para retirar.
- **Asistente con IA** que entiende el trabajo ("quiero colgar un estante en pared de ladrillo"), arma la lista completa (herramientas, materiales, fijaciones, seguridad) con precios y stock reales, la muestra como tarjetas con botón *Agregar* y, si el cliente confirma, **crea el pedido**.
- **Panel del negocio** (`/admin`): pedidos con estados y aviso por WhatsApp, inventario editable con alertas de stock bajo, estadísticas (ventas por día, productos más pedidos, canal web vs. asistente) y las conversaciones con la IA, vinculadas a cada pedido.

## Cómo está integrada la IA
La IA no es un chat pegado al costado: es el flujo de venta. Usa *function calling* (OpenAI Chat Completions) sobre la misma base de datos que la tienda:

| Herramienta | Qué hace |
|---|---|
| `buscar_productos` | Busca en el catálogo real (por nombre, marca o uso). |
| `verificar_stock` | Valida stock y calcula subtotales. |
| `mostrar_lista` | Muestra la lista como tarjetas; precios y stock salen siempre de la base, nunca del modelo. |
| `crear_pedido` | Crea el pedido y descuenta stock en una transacción; exige confirmación explícita y no permite duplicados. |

Decisiones de diseño: el modelo nunca inventa precios (los lee de las herramientas), avanza con una lista antes de preguntar, y todo pedido se valida de nuevo en el servidor. Las respuestas llegan con progreso en vivo ("Buscando…", "Verificando stock…").

## Robustez
Reintentos y tope de tiempo ante errores de la API, mensajes de error claros, límites de uso por IP y globales (protegen la key compartida y el stock), sesión de admin con vencimiento, cabeceras de seguridad (CSP) y la API key solo en el `.env` del servidor.

## Cómo se corre
```bash
node server.js            # Node 22+, sin dependencias
```
Variables en `.env` (no se sube al repo):
```
ADMIN_PASSWORD=...        # clave del panel
OPENAI_API_KEY=...        # key del evento
OPENAI_MODEL=gpt-4.1-mini
# opcionales: CHAT_MAX_POR_MIN, CHAT_MAX_POR_DIA, CHAT_MAX_GLOBAL_HORA, PEDIDOS_MAX_10MIN
```
En producción corre con PM2 detrás de nginx (puerto 3000).

## Estructura
`server.js` (API, auth, límites) · `db.js` (SQLite, pedidos, estadísticas) · `assistant.js` (IA) · `conversaciones.js` · `public/` (tienda, chat flotante, panel).

## Qué mejoraría
Pagos online, avisos automáticos por WhatsApp, fotos de producto, y que el asistente aprenda de los pedidos anteriores para sugerir cantidades.

## Diseño de la tienda
La tienda (`public/index.html`, `tienda.css`, `app.js`) está pensada primero para el celular: encabezado con buscador, categorías que se deslizan, grilla de 2 columnas, ficha de producto como hoja inferior y pedido en panel lateral. `styles.css` queda solo para el panel `/admin`.

Los datos del local (dirección, horarios, teléfono, WhatsApp) se completan en `public/negocio.js`; lo que quede vacío no se muestra.
