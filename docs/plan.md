# Plan — App de gestión del taller de carpintería

Fecha: 2026-11-07 · Estado: borrador para aprobación

## 1. Objetivo

Reemplazar el Excel `Calculo muebles presupuesto.xlsx` por una web app compartida por 2–3 socios para gestionar **clientes, proyectos, billetera (cajas y movimientos) y presupuestos de muebles**, todo conectado entre sí.

## 2. Stack y arquitectura

- **TypeScript + React + Vite**, React Router en modo `HashRouter` (GitHub Pages no soporta rutas SPA).
- UI: Tailwind CSS + shadcn/ui. Formularios con react-hook-form + zod.
- **Firebase (plan Spark)**: Auth con Google y Firestore con `persistentLocalCache` (soporte básico sin conexión). Sin Cloud Functions: toda la lógica corre en el cliente y la seguridad depende de las reglas de Firestore.
- Lista blanca: colección `members/{email}`. Las reglas solo permiten leer o escribir a emails que estén en esa colección.
- PDF: `@react-pdf/renderer`, generado en el navegador.
- 3D (fase posterior): `three` + `@react-three/fiber`. El modelo de datos del mueble ya guarda la geometría necesaria.
- Deploy: GitHub Actions → GitHub Pages (`usuario.github.io/<repo>`).
- Dinero: **enteros en céntimos de EUR**. Nunca floats.
- Cálculos (presupuesto, balances, reparto) en un módulo de dominio puro `src/domain/` con tests unitarios (Vitest).
- Auditoría: cada documento guarda `createdBy/createdAt/updatedBy/updatedAt`. Las ediciones y bajas de movimientos se registran en `auditLog`. Los movimientos nunca se borran físicamente (soft delete).
- PC primero, responsive para celular.

## 3. Modelo de datos (Firestore)

| Colección | Campos clave |
|---|---|
| `members` | email, nombre, activo |
| `settings/workshop` | nombre, logo, datos fiscales, texto de condiciones/observaciones por defecto para el PDF, umbrales de alertas |
| `clients` | nombre, teléfono, email, dirección, **origen** (Wallapop, recomendación…), notas |
| `clients/{id}/contacts` | fecha, medio, nota, miembro · `nextContactAt` (fecha a contactar) |
| `projects` | clienteId, título, resumen, estado (`pendiente`, `en_proceso`, `finalizado`, `cancelado`, `entregado`, `cobrado`, `archivado`), fechaSolicitud, fechaPresupuesto, fechaEntregaComprometida, fechaEntregaReal, participación `{memberId: %, taller: %}` (suma 100), notas, presupuestoAceptadoId |
| `boxes` (cajas) | nombre (Efectivo, Banco…), activa |
| `movements` | tipo (`cobro`, `gasto_proyecto`, `gasto_general`, `retiro`, `aporte`, `transferencia`, `reintegro`), monto, cajaId (o `pagadoPor: memberId` si salió del bolsillo de un socio), proyectoId?, gastoGeneralId?, categoría, detalle, fecha, registradoPor, eliminado |
| `generalExpenses` | nombre, tipo (`fijo` mensual / `esporádico`), categoría (Taller, Herramientas, Insumos…), monto, reparto `{memberId: %, taller: %}` |
| `catalog/materials` | nombre, proveedor, link, ancho×alto de placa (mm), espesor, precio por placa, factor de desperdicio |
| `catalog/edgeBanding` | nombre, precio por metro lineal |
| `catalog/hardware` | nombre, tipo (bisagra, guía, tip-on, tirador, LED, perfil…), unidad (u / par / ml), precio, proveedor, link |
| `catalog/services` | corte+canteado por m², tarifa de mano de obra sugerida por m², por puerta y por cajón |
| `templates` | plantilla de mueble (mismos campos que el ítem de presupuesto, con valores por defecto) |
| `quotes` | proyectoId, versión (v1, v2…), estado (`borrador`, `enviado`, `aceptado`, `aceptado_parcial`, `rechazado`, `vencido`, `finalizado`, `archivado`), validoHasta, ítems, líneas libres, ajustes, totales calculados, % anticipo |
| `auditLog` | entidad, id, acción, antes/después, miembro, fecha |

**Ítem de presupuesto (mueble):** nombre, cantidad, ancho/alto/profundidad, estantes, divisiones, materiales (estructura, trasera, frentes) con sus espesores, puertas (cantidad, material, tipo de bisagra y cantidad), cajones (cantidad, tipo de guía), metros de canto, herrajes extra del catálogo, extras por metro lineal (LED, perfil, zócalo), otros herrajes en € manuales, **mano de obra sugerida → valor final manual**, complejidad (€), redondeo, aceptado (sí/no para la aceptación parcial). La geometría se guarda como datos para poder dibujar el 3D después.

## 4. Reglas de negocio

- **Cálculo por mueble (sugerido):** m² de estructura = (2·alto·prof + 2·ancho·prof + estantes·ancho·prof); m² de puertas = ancho·alto·nº puertas; m² de trasera = ancho·alto. Coste de material = m² × precio/m² de la placa × factor de desperdicio. Corte/canto = m² totales × tarifa de servicio. Herrajes = Σ cantidad × precio. Mano de obra sugerida a partir de m² y herrajes; el usuario escribe el valor final.
- **Placas enteras:** a nivel presupuesto se suman los m² de cada material (con desperdicio) y se redondea **hacia arriba al número de placas**. El coste de materiales del presupuesto usa placas enteras y se reparte entre los muebles en proporción a sus m². El canto se muestra como línea aparte.
- **Totales del presupuesto:** Σ muebles aceptados + líneas libres (servicios: instalación, retirada de horno…) + ajustes con motivo (por ejemplo "diseño +500", "descuento −100"). IVA: opcional, desactivado por defecto.
- **Flujo de dinero:**
  - Presupuesto `enviado` → ingresos futuros "enviados".
  - Presupuesto `aceptado` o `aceptado_parcial` → ingresos futuros "aceptados" (total aceptado − cobrado).
  - Cada `cobro` (seña o total) entra en una caja → fondos disponibles.
- **Ganancia del proyecto** = cobros − gastos del proyecto. Se reparte según la participación del proyecto.
- **Saldo de cada socio** = Σ (ganancia de cada proyecto × su %) − Σ (gasto general × su % de reparto) + aportes − retiros + lo que el taller le debe.
- **Gasto pagado de su bolsillo:** si un socio paga con su dinero, el taller le queda debiendo ese monto. Un movimiento `reintegro` salda la deuda (reemplaza la "Devolución a Nacho" del Excel).
- **Billetera (panel):** saldo por caja y total; fondo real = total − deudas con socios; saldo por socio; ingresos futuros (aceptados y enviados por separado); estado de cada proyecto (presupuesto, cobrado, falta cobrar, % cobrado).
- **Alertas de contacto:** cliente o proyecto con `nextContactAt` vencida, o sin contacto hace más de N días (configurable). Botón de WhatsApp (`wa.me/<tel>`).

## 5. Lo que hace el Excel y no estaba en el pedido (incorporado)

1. Gastos que un socio paga de su bolsillo y su posterior devolución → `pagadoPor` + `reintegro`.
2. "Hay que pagar": gastos comprometidos todavía no pagados → movimiento con estado `pendiente_pago`.
3. Factor de desperdicio por material y servicio de corte/canteado por m².
4. Dos tipos de bisagra por mueble, guías de cajón, "otros herrajes" en € y complejidad en €.
5. Extras por metro lineal: LED (perfil + tira + fuente), zócalo, perfiles.
6. Proveedor y link de compra en cada ítem del catálogo (hoja "Precios de mercado").
7. Líneas libres de servicios en el presupuesto (hoja "Presupuesto formato lista") y anticipo mostrado en el PDF.
8. Texto de observaciones/condiciones reutilizable en el PDF.
9. Ajustes de precio con justificación (hoja "Sheet19").
10. Versiones de presupuesto (Julieta / Julieta_v2).
11. Origen del cliente y botón de WhatsApp (hoja "Clientes seguimiento").
12. Comparación estimado vs. real de los gastos de un proyecto.
13. **Lista de compras** (ferretería y maderas) generada desde el presupuesto aceptado, con estado pedido/recibido (hojas "Pedido de ferretería pendiente" y "Planilla base para desglose").
14. Compra compartida entre proyectos (tornillos repartidos por unidades) → un gasto se puede dividir entre varios proyectos.
15. Multiplicador sobre materiales (×2,3 / ×2,5, hoja "Aranxa") como método alternativo para sugerir el precio.

## 6. Pasos

## Step 1 — Crear la base del proyecto, login y deploy
Inicializar Vite + React + TypeScript + Tailwind + shadcn/ui + Vitest, con la configuración de Firebase en variables de entorno. Agregar login con Google contra la lista blanca `members`, el layout (menú lateral en PC, inferior en celular), HashRouter, persistencia offline de Firestore y el workflow de GitHub Actions para publicar en GitHub Pages.
Out of scope: pantallas de negocio (clientes, proyectos, billetera, presupuestos).

## Step 2 — Crear el modelo de datos, las reglas de Firestore y el módulo de dominio
Definir los tipos TS y esquemas zod de todas las colecciones de la sección 3, las reglas de Firestore (solo miembros, auditoría obligatoria, sin borrado físico de movimientos), helpers de dinero en céntimos y `auditLog`. Agregar al módulo `src/domain/` las funciones puras de reparto y validación de participación (suma 100), con tests.
Out of scope: UI.

## Step 3 — Implementar la agenda de clientes y el historial de contactos
CRUD de clientes con origen, historial de contactos, fecha próxima de contacto, alertas configurables en el inicio y botón de WhatsApp.

## Step 4 — Implementar la gestión de proyectos
Lista con filtros por estado, ficha del proyecto (resumen, cliente, fechas, participación por socio y taller que sume 100, notas, último contacto, presupuestos vinculados, movimientos del proyecto, gastos extra, estimado vs. real) y botón "Crear presupuesto" desde el proyecto.

## Step 5 — Implementar cajas y movimientos de la billetera
CRUD de cajas. Alta, edición y baja lógica de movimientos de todos los tipos (cobro, gasto de proyecto o general, retiro, aporte, transferencia, reintegro, pendiente de pago), con quién registró y quién pagó, gasto dividido entre proyectos, auditoría de cambios y listado filtrable.

## Step 6 — Implementar los gastos generales fijos y esporádicos
Gastos generales con categoría, tipo fijo mensual o esporádico, reparto en % entre socios y taller (suma 100). Para los fijos, un recordatorio mensual que genera el movimiento en un clic.

## Step 7 — Implementar el panel de la billetera
Panel con saldo por caja y total, fondo real, deudas del taller con cada socio, saldo por socio según las fórmulas de la sección 4, ingresos futuros aceptados vs. enviados, y estado de cobro por proyecto. Todos los cálculos viven en `src/domain/` con tests.

## Step 8 — Implementar los catálogos y las plantillas de mueble
Pantallas editables para materiales (placa, precio, desperdicio, proveedor, link), cantos, herrajes, servicios y tarifas de mano de obra, con importación inicial de los valores de la hoja DB del Excel. CRUD de plantillas de mueble.

## Step 9 — Implementar el editor de presupuestos y el cálculo
Editor rápido: agregar muebles desde plantillas eligiendo medidas y cantidades, editar cada unidad, líneas libres, ajustes con motivo y % de anticipo. Cálculo según la sección 4, con conteo de placas enteras por material. Lista resumida (medidas + coste por mueble), versiones, estados, aceptación parcial y vinculación con un proyecto, de modo que los totales alimenten los ingresos futuros de la billetera.
Out of scope: visor 3D (solo dejar la geometría en el modelo).

## Step 10 — Implementar el PDF del presupuesto
PDF listo para el cliente: logo y datos del taller, datos del cliente, lista de muebles con medidas y total por mueble, líneas libres, total, anticipo, validez, condiciones de pago y plazo de entrega, observaciones. Hueco reservado para la imagen 3D.

## Step 11 — Implementar la lista de compras desde el presupuesto aceptado
A partir de los muebles aceptados, generar la lista agregada de herrajes y placas con proveedor y link, con estados pendiente / pedido / recibido, y opción de registrar la compra como gasto del proyecto.

## Step 12 — Tests y verificación de los flujos principales
Tests e2e (Playwright) de: login → crear cliente → proyecto → presupuesto → aceptar → cobrar seña → ver billetera.

## Step 13 — Auditoría de seguridad de las reglas de Firestore y del login
Revisar que un usuario fuera de la lista blanca no pueda leer ni escribir y que la auditoría no pueda falsificarse.

## Step 14 — Implementar el visor 3D simplificado (fase posterior)
Implementar con react-three-fiber: cajas con puertas y cajones marcados, vista por mueble y escena con todos, rotación y zoom, captura de imagen para el PDF.
