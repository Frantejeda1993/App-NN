# Taller NN — guía para Claude

App web de gestión de un taller de carpintería (2-3 socios): clientes y contactos, proyectos,
presupuestos de muebles (con cálculo de placas, PDF y vista 3D), lista de compras y billetera
(cajas, movimientos, gastos generales, reparto de ganancias entre socios y el taller).
Reemplaza el Excel «Calculo muebles presupuesto.xlsx». Plan original: [docs/plan.md](docs/plan.md).
Seguridad: [SECURITY.md](SECURITY.md). Puesta en marcha: [README.md](README.md).

## Antes de responder o de tocar código: usar el grafo (graphify)

El repo trae un grafo de conocimiento del código y la documentación en `graphify-out/`:

- `graphify-out/GRAPH_REPORT.md`: comunidades (áreas del código), nodos centrales, conexiones
  sorprendentes y preguntas sugeridas. **Leelo primero** para orientarte.
- `graphify-out/graph.json`: el grafo. Consultalo antes de buscar a mano:
  - `graphify query "<pregunta>"`: contexto amplio (BFS); `--dfs` para seguir un camino.
  - `graphify path "A" "B"`: cómo se conectan dos piezas.
  - `graphify explain "X"`: qué es un nodo y con qué se relaciona.
- `graphify-out/graph.html`: el mismo grafo, interactivo, para abrir en el navegador.

Si `graphify` no está instalado: `pipx install graphifyy` (o `uv tool install graphifyy`).
No necesita ninguna API key.

### Mantener el grafo actualizado (obligatorio)

- **Después de cambiar código** (`.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.yml`), y antes del commit:
  `graphify update .` (solo AST, gratis, sin modelo). Si borraste o moviste archivos y se niega a
  achicar el grafo: `graphify update . --force`.
- **Después de cambiar documentación** (`*.md`, `docs/`) o imágenes: correr `/graphify . --update`
  (extracción semántica solo de lo que cambió).
- Commitear `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.html` y
  `graphify-out/manifest.json` junto con el cambio. El resto de `graphify-out/` (caché, rutas
  locales) está en `.gitignore`.
- Opcional, por clon: `graphify hook install` reconstruye el grafo del código en cada commit.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm ci` | Instala dependencias |
| `npm run dev` | Desarrollo contra el Firebase real (`.env.local`) |
| `npm run dev:emulators` | Desarrollo con emuladores y datos de prueba (Java 21+) |
| `npm test` | Tests unitarios y de componentes (Vitest + jsdom) |
| `npm run test:rules` | Tests de `firestore.rules` en el emulador (**Java 21+**) |
| `npm run test:e2e` | Playwright contra los emuladores (Java 21+) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` | Build de producción (inyecta la CSP) |

Antes de dar algo por terminado: `npm run lint`, `npm run typecheck` y `npm test` en verde. Si
tocaste `firestore.rules`, también `npm run test:rules` (o el CI, que corre con Java 21).

## Arquitectura

- **Stack:** React 19 + TypeScript + Vite, Tailwind, react-hook-form + zod, Firebase (Auth con
  Google + Firestore, plan Spark, **sin backend ni Cloud Functions**), PWA, GitHub Pages.
- `src/domain/`: lógica **pura** y testeada (dinero, porcentajes, presupuestos, panel de la
  billetera, reparto, ciclo de vida del presupuesto, lista de compras, 3D). Sin React ni Firebase.
- `src/model/`: esquemas zod de cada colección (`COLLECTIONS`, `SETTINGS_DOCS`). Son el contrato.
- `src/data/`: `api.ts` (interfaz `DataApi`), `firestoreApi.ts` (implementación real, lectura en
  vivo con `onSnapshot`), `repo.ts` (escrituras: auditoría, lotes, `updateWithRev`, movimientos
  versionados), `hooks.ts` (`useX()`: `undefined` = cargando).
- `src/test/fakeApi.ts`: `FakeDataApi` en memoria para tests. **Debe comportarse como las reglas**
  (rechazos asíncronos, `rev`, solo borradores se borran, etc.): si cambiás una regla, cambiá el fake.
- `src/features/<área>/`: pantallas por dominio (clients, projects, quotes, furniture, wallet,
  catalog, home, tour). `src/components/ui/`: componentes base.
- `firestore.rules`: **la única barrera de seguridad real**. Espeja los esquemas zod.

## Reglas del dominio (no romper)

- **Dinero en céntimos enteros**; porcentajes en puntos básicos (10000 = 100 %). Repartos con
  `allocateByWeights` (la suma de las partes siempre es el total). Nunca floats guardados.
- **Movimientos:** nunca se borran (baja lógica con motivo obligatorio); cada alta/edición/baja
  sube `version` y escribe `auditLog/{id}_v{n}` en el mismo lote. Las reglas exigen los campos
  según el tipo. Tipos: cobro, gasto_proyecto, gasto_general, retiro, aporte, transferencia,
  reintegro, **reparto** (pasa fondo del taller a un socio, sin caja).
- **Concurrencia:** presupuestos y proyectos llevan `rev`; toda escritura va por `updateWithRev`
  (sube `rev` en 1 y las reglas lo exigen). Un presupuesto y su proyecto se guardan en un lote.
- **Panel de la billetera** (`src/domain/dashboard.ts`): lo de cada uno = saldo inicial +
  proyectos − gastos generales + aportes − retiros + deuda del taller + reparto. Control: la suma
  de todos = cajas − gastos pendientes. Saldos iniciales en `settings/opening`.
- **Campo nuevo en un documento** ⇒ actualizar esquema zod, `firestore.rules` (listas `hasOnly`),
  `FakeDataApi`, tests de reglas, y **publicar las reglas antes de desplegar la app**
  (`npx firebase deploy --only firestore:rules`): el CI prueba las reglas pero no las publica.

## Convenciones

- UI y mensajes en **español rioplatense con voseo** («Elegí», «Guardá»). Comentarios en español.
- Actualizaciones inmutables; nada de `console.log` en la app; manejar errores con
  `notifyError` / `notifyWrite` (`src/lib/notify.ts`). Escrituras: `WriteResult.committed` puede
  quedar pendiente sin conexión; no esperarla para navegar.
- Botones que crean algo: guardia contra doble envío (`useRef`). Formularios: validar con zod y
  mostrar el error junto al campo.
- Tests junto al código (`*.test.ts(x)`), con `renderApp` + `FakeDataApi`. TDD para lógica nueva.
- Archivos de menos de 800 líneas; componentes grandes se parten (ver `features/quotes/`).

## Despliegue

Cada push a `main` corre lint, typecheck, tests unitarios, tests de reglas y e2e, y si pasan
publica en GitHub Pages (`https://frantejeda1993.github.io/App-NN/`). Las acciones del CI están
fijadas por SHA (Dependabot las actualiza).
