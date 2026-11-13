# Graph Report - App NN  (2026-11-13)

## Corpus Check
- 172 files · ~85,759 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 1, .rules 1)

## Summary
- 1256 nodes · 4239 edges · 50 communities (46 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.86)
- Token cost: 91,668 input · 0 output

## Community Hubs (Navigation)
- Componentes UI base
- Shell de la app y convenciones
- Pantallas de billetera
- Panel de la billetera
- Autenticación y socios
- Cálculo de presupuestos y PDF
- Herramientas de desarrollo
- Tests e2e (Playwright)
- Tests de pantallas
- Escrituras de DataApi
- Ajustes y API de prueba
- Esquemas zod y auditoría
- Capa Firestore
- Tipos y altas de la API de prueba
- Dependencias de producción
- TS config de la app
- Plan: modelo de datos y dinero
- Geometría 3D de muebles
- Tipos de datos y orden
- TS config de Node
- Arquitectura (CLAUDE.md)
- Tests de inicio
- Esquemas de clientes y proyectos
- Pantalla de catálogo
- Datos de prueba del emulador
- Plantillas del Excel
- Reparto y tests de reglas
- Disparadores del deploy
- Visor 3D (React Three)
- Build con Vite y PWA
- Scripts npm
- Seguridad: reglas y auditoría
- Contexto del proyecto (CLAUDE.md)
- Plan: presupuestos y etapas
- Jobs del CI
- Job de publicación en Pages
- Modelo de movimientos
- Pasos del CI
- Variables de Firebase en CI
- Parámetros de acciones del CI
- Dependabot
- Plan: base, offline y socios
- Logo e íconos
- Protecciones de seguridad
- Catálogo: tipos de datos
- TS config raíz
- Desarrollo con emuladores
- Alta de herrajes
- Edición de plantillas

## God Nodes (most connected - your core abstractions)
1. `FakeDataApi` - 99 edges
2. `Button()` - 65 edges
3. `useData()` - 62 edges
4. `formatEuros()` - 60 edges
5. `Card()` - 56 edges
6. `DataApi` - 56 edges
7. `notifyError()` - 49 edges
8. `notifyWrite()` - 46 edges
9. `Input()` - 45 edges
10. `Editor()` - 44 edges

## Surprising Connections (you probably didn't know these)
- `src/data: DataApi, firestoreApi, repo, hooks` --references--> `DataApi`  [AMBIGUOUS]
  CLAUDE.md → src/data/api.ts
- `Ediciones simultaneas con contador rev` --references--> `updateWithRev()`  [INFERRED]
  SECURITY.md → src/data/repo.ts
- `Dinero en centimos enteros y porcentajes en puntos basicos` --references--> `allocateByWeights()`  [EXTRACTED]
  CLAUDE.md → src/domain/percent.ts
- `FakeDataApi debe comportarse como las reglas` --references--> `FakeDataApi`  [EXTRACTED]
  CLAUDE.md → src/test/fakeApi.ts
- `firestore.rules as the only real security barrier` --semantically_similar_to--> `Firebase Spark without Cloud Functions: all logic client-side, security via rules`  [INFERRED] [semantically similar]
  README.md → docs/plan.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules-enforced security layer (whitelist, server audit fields, movement versioning, quote deletion)** — readme_firestore_rules_only_barrier, readme_members_whitelist, readme_server_audit_fields, readme_movement_versioning_auditlog, readme_quote_draft_deletion_rule [EXTRACTED 1.00]
- **Quote pricing pipeline (catalog -> item cost -> whole sheets -> totals)** — docs_plan_catalog, docs_plan_furniture_quote_item, docs_plan_furniture_cost_calculation, docs_plan_whole_sheet_rounding, docs_plan_quote_totals [EXTRACTED 1.00]
- **Wallet accounting (movements, money flow, partner balance, reintegro, dashboard)** — docs_plan_movements_collection, docs_plan_money_flow, docs_plan_partner_balance, docs_plan_out_of_pocket_reintegro, docs_plan_wallet_dashboard [EXTRACTED 1.00]
- **Propagacion de un campo nuevo: zod, reglas, fake y tests** — claude_new_field_checklist, claude_model_layer, claude_firestore_rules, src_test_fakeapi_fakedataapi, claude_fake_data_api_parity [EXTRACTED 1.00]
- **Integridad del dinero: centimos, movimientos versionados, auditLog y reglas** — claude_money_in_cents, claude_versioned_movements, security_strict_money_movements, security_firestore_rules_barrier, src_domain_percent_allocatebyweights [INFERRED 0.85]
- **Endurecimiento del cliente estatico en GitHub Pages** — security_frame_guard, security_csp_plugin, security_safe_href, security_dev_login_guard, security_url_param_validation [INFERRED 0.75]

## Communities (50 total, 4 thin omitted)

### Community 0 - "Componentes UI base"
Cohesion: 0.06
Nodes (99): lucide-react, react, Button(), ButtonProps, Dialog(), Field(), Input(), Select() (+91 more)

### Community 1 - "Shell de la app y convenciones"
Cohesion: 0.08
Nodes (92): AppRoutes(), Badge(), Card(), byDateDesc(), SettingsState, DataContext, useData(), useLive() (+84 more)

### Community 2 - "Pantallas de billetera"
Cohesion: 0.07
Nodes (63): react-router-dom, buttonVariants, useBoxes(), useGeneralExpenses(), useMovements(), useOpeningBalances(), workshopFund(), dueFixedExpenses() (+55 more)

### Community 3 - "Panel de la billetera"
Cohesion: 0.06
Nodes (60): settings/opening (saldos iniciales), Panel de la billetera, @hookform/resolvers, react-hook-form, ACCEPTED, acceptedAmount(), Allocation, allocations() (+52 more)

### Community 4 - "Autenticación y socios"
Cohesion: 0.05
Nodes (41): nacho, setup(), AuthContext, AuthContextValue, AuthProvider(), AuthState, storage, extrano (+33 more)

### Community 5 - "Cálculo de presupuestos y PDF"
Cohesion: 0.06
Nodes (39): CatalogLike, computeQuote(), itemAreas(), ItemLike, m2(), PanelLike, QuoteTotals, RatesLike (+31 more)

### Community 6 - "Herramientas de desarrollo"
Cohesion: 0.06
Nodes (46): devDependencies, eslint@^9.39.1, @eslint/js@^9.39.1, eslint-plugin-react-hooks@^7.0.1, eslint-plugin-react-refresh@^0.4.24, @firebase/rules-unit-testing@^6.0.0, firebase-tools@^15.35.0, globals@^16.5.0 (+38 more)

### Community 7 - "Tests e2e (Playwright)"
Cohesion: 0.11
Nodes (25): deleteDoc(), DEV, euros(), fields(), headers, Json, kpi(), listDocs() (+17 more)

### Community 8 - "Tests de pantallas"
Cohesion: 0.12
Nodes (19): @testing-library/react, @testing-library/user-event, vitest, today, SHARES, today, SHARES, SHARES (+11 more)

### Community 9 - "Escrituras de DataApi"
Cohesion: 0.07
Nodes (4): DataApi, WriteResult, BoxData, BoxDataSchema

### Community 10 - "Ajustes y API de prueba"
Cohesion: 0.08
Nodes (9): ServiceRatesState, seedCatalog(), setup(), newUser(), ServiceRates, UserPrefs, WorkshopSettings, OpeningBalances (+1 more)

### Community 11 - "Esquemas zod y auditoría"
Cohesion: 0.09
Nodes (28): zod, AUDIT_ACTIONS, AuditLog, AuditLogSchema, MaterialDataSchema, supplierFields, AuditFields, AuditFieldsSchema (+20 more)

### Community 12 - "Capa Firestore"
Cohesion: 0.17
Nodes (27): createFirestoreDataApi(), onError(), StoredMovementSchema, toStored(), watchList(), addContact(), addMovementVersion(), auditOnCreate() (+19 more)

### Community 13 - "Tipos y altas de la API de prueba"
Cohesion: 0.14
Nodes (4): DistributionInput, Movement, ClientData, ProjectData

### Community 14 - "Dependencias de producción"
Cohesion: 0.09
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, firebase@^13.2.0, @hookform/resolvers@^7.0.3, jspdf@4.2.1, jspdf-autotable@5.0.9, lucide-react@^1.70.0 (+16 more)

### Community 15 - "TS config de la app"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 16 - "Plan: modelo de datos y dinero"
Cohesion: 0.11
Nodes (22): Catalog (materials, edgeBanding, hardware, services) with supplier and link, Contact alerts (nextContactAt overdue / N days) + WhatsApp button, Pure domain module src/domain/ (quote, balances, split calculations) with Vitest, Excel features incorporated (15 items: pending payments, waste factor, shopping list, shared purchases, multiplier...), Goal: replace Excel 'Calculo muebles presupuesto.xlsx' for 2-3 partners, Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog), Money as integer EUR cents, never floats, Money flow: sent/accepted quotes as future income, cobro into boxes (+14 more)

### Community 17 - "Geometría 3D de muebles"
Cohesion: 0.13
Nodes (14): three@0.186.1, three, COLORS, furnitureBoxes(), ItemGeometry, LaidOutItem, layoutItems(), m() (+6 more)

### Community 18 - "Tipos de datos y orden"
Cohesion: 0.12
Nodes (8): AuditEntry, byCreatedDesc(), byMovementDesc(), byName(), Client, Contact, Quote, Stored

### Community 19 - "TS config de Node"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 20 - "Arquitectura (CLAUDE.md)"
Cohesion: 0.15
Nodes (10): src/data: DataApi, firestoreApi, repo, hooks, src/domain: logica pura testeada, src/features/<area> y src/components/ui, firestore.rules (unica barrera de seguridad real), src/model: esquemas zod (COLLECTIONS, SETTINGS_DOCS), Checklist de la consola Firebase/Google Cloud, Vigilancia en vivo del socio desactivado (cierra sesion y borra cache), Acceso: Google con email verificado + members/{email} active (+2 more)

### Community 21 - "Tests de inicio"
Cohesion: 0.18
Nodes (10): seedExpenses(), SHARES, today, seed(), seed(), seed(), seed(), seed() (+2 more)

### Community 22 - "Esquemas de clientes y proyectos"
Cohesion: 0.16
Nodes (14): isoDateSchema, nullableId, SharesSchema, ClientDataSchema, ContactData, ContactDataSchema, MemberData, MemberDataSchema (+6 more)

### Community 23 - "Pantalla de catálogo"
Cohesion: 0.17
Nodes (12): EXCEL_TEMPLATE_NAMES, excelTemplates(), RATE_FIELDS, supplierFields, Tab, TABS, HARDWARE_KIND_LABELS, HARDWARE_UNIT_LABELS (+4 more)

### Community 24 - "Datos de prueba del emulador"
Cohesion: 0.20
Nodes (12): audit, fields(), geShares, headers, iso(), movement(), mvBase, pad() (+4 more)

### Community 25 - "Plantillas del Excel"
Cohesion: 0.23
Nodes (11): DB_MATERIALS, DEFAULT_SHEET, EXCEL_TEMPLATES, excelSeed(), extra, parseSheetSize(), parseThickness(), pricePerM2Cents() (+3 more)

### Community 26 - "Reparto y tests de reglas"
Cohesion: 0.19
Nodes (9): firebase, StoredMovement, DISTRIBUTION_CATEGORY, distributionMovements(), MovementDataSchema, cobro, rawBatch(), rawMovement() (+1 more)

### Community 27 - "Disparadores del deploy"
Cohesion: 0.17
Nodes (11): concurrency, cancel-in-progress, group, name, on, pull_request, push, workflow_dispatch (+3 more)

### Community 28 - "Visor 3D (React Three)"
Cohesion: 0.23
Nodes (11): @react-three/drei@10.7.9, @react-three/fiber@9.8.1, @react-three/drei, @react-three/fiber, Box3, sceneBounds(), Controls, FitCamera() (+3 more)

### Community 29 - "Build con Vite y PWA"
Cohesion: 0.17
Nodes (9): @tailwindcss/vite@^4.3.5, vite@^7.3.1, vite-plugin-pwa@^2.0.0, @vitejs/plugin-react@^5.1.1, @tailwindcss/vite, vite, vite-plugin-pwa, @vitejs/plugin-react (+1 more)

### Community 30 - "Scripts npm"
Cohesion: 0.17
Nodes (12): scripts, build, coverage, dev, dev:emulators, lint, preview, test (+4 more)

### Community 31 - "Seguridad: reglas y auditoría"
Cohesion: 0.20
Nodes (7): Audit fields + auditLog + movement soft delete, Step 2: data model, Firestore rules, domain module, Movement soft delete + versioning with auditLog/{id}_v{n} and conflict detection, Quotes: only drafts deletable; sent cannot return to draft, Server-set audit fields createdBy/createdAt/updatedBy/updatedAt, Client-side zod validation (src/model), App Check + reCAPTCHA v3 (pendiente opcional)

### Community 32 - "Contexto del proyecto (CLAUDE.md)"
Cohesion: 0.22
Nodes (8): Comandos npm (dev, test, test:rules, test:e2e, lint, typecheck, build), CI/CD a GitHub Pages en push a main, Excel Calculo muebles presupuesto.xlsx, Taller NN app (gestion de taller de carpinteria), Taller NN - guia para Claude, Stack: React 19 + TS + Vite + Tailwind + zod + Firebase (Spark) + PWA + GitHub Pages, Acciones del CI fijadas por SHA + Dependabot, Suites de prueba (unit, rules, e2e) en CI

### Community 33 - "Plan: presupuestos y etapas"
Cohesion: 0.24
Nodes (10): 3D furniture viewer (three + @react-three/fiber, later phase), Per-furniture cost calculation (m2 structure/doors/back x price x waste factor + cutting + hardware), Quote item (furniture): dimensions, materials, doors, drawers, hardware, manual labor, geometry for 3D, Implementation steps 1-14, PDF generation in browser with @react-pdf/renderer, Step 10: quote PDF, Step 12: Playwright e2e of main flow (login to wallet), Step 13: security audit of Firestore rules and login (+2 more)

### Community 34 - "Jobs del CI"
Cohesion: 0.20
Nodes (10): if, needs, runs-on, runs-on, runs-on, timeout-minutes, jobs, build (+2 more)

### Community 35 - "Job de publicación en Pages"
Cohesion: 0.20
Nodes (10): environment, if, needs, permissions, runs-on, name, url, deploy (+2 more)

### Community 36 - "Modelo de movimientos"
Cohesion: 0.20
Nodes (9): GENERAL_EXPENSE_KINDS, MAX_PROJECT_SPLITS, MEMBER_MOVEMENT_TYPES, MOVEMENT_STATUSES, MOVEMENT_TYPES, MovementBaseSchema, PersonOpening, PersonOpeningSchema (+1 more)

### Community 37 - "Pasos del CI"
Cohesion: 0.31
Nodes (9): steps, steps, steps, steps, id, if, name, run (+1 more)

### Community 38 - "Variables de Firebase en CI"
Cohesion: 0.22
Nodes (9): CI, VITE_BASE, VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET (+1 more)

### Community 39 - "Parámetros de acciones del CI"
Cohesion: 0.22
Nodes (9): with, cache, distribution, java-version, name, node-version, path, persist-credentials (+1 more)

### Community 40 - "Dependabot"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 41 - "Plan: base, offline y socios"
Cohesion: 0.29
Nodes (7): React Router HashRouter, Firestore persistentLocalCache (basic offline support), Step 1: project base, Google login, layout, deploy, CI/CD: push to main runs lint, typecheck, tests, rules tests then deploys to GitHub Pages, members/{email} whitelist (lowercase id, active: true), Offline support: installable PWA + Firestore local cache, One-time setup (Firebase Auth, members collection, rules deploy, GitHub variables, Pages)

### Community 42 - "Logo e íconos"
Cohesion: 0.52
Nodes (7): App-NN Brand Mark (geometric N, black slate + walnut wood on cream), Apple Touch Icon 180x180 (iOS home-screen icon, split black/walnut N mark), Maskable PWA Icon 512x512 (padded safe-zone N mark), PWA Install Icon 192x192 (split black/walnut N mark), PWA Install Icon 512x512 (split black/walnut N mark), PWA Icon 64x64 (small favicon-size N mark), In-App Logo (faceted N: black slate and walnut wood pieces)

### Community 43 - "Protecciones de seguridad"
Cohesion: 0.33
Nodes (7): Content-Security-Policy por <meta> (cspPlugin), npm audit --omit=dev (grpc-js forzado), Login falso de desarrollo solo con import.meta.env.DEV, frameGuard: no arranca dentro de un marco (clickjacking), Tabla de protecciones (riesgo / proteccion / prueba), Parametros de URL acotados (MovementNewPage), userPrefs aisladas por socio

### Community 44 - "Catálogo: tipos de datos"
Cohesion: 0.29
Nodes (4): CatalogSeed, EdgeBandingData, HardwareData, MaterialData

### Community 45 - "TS config raíz"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

## Ambiguous Edges - Review These
- `DataApi` → `src/data: DataApi, firestoreApi, repo, hooks`  [AMBIGUOUS]
  CLAUDE.md · relation: references
- `dashboard.ts` → `Panel de la billetera`  [AMBIGUOUS]
  CLAUDE.md · relation: references
- `firebase.ts` → `Login falso de desarrollo solo con import.meta.env.DEV`  [AMBIGUOUS]
  SECURITY.md · relation: references
- `cspPlugin()` → `Content-Security-Policy por <meta> (cspPlugin)`  [AMBIGUOUS]
  SECURITY.md · relation: references

## Knowledge Gaps
- **16 isolated node(s):** `Emulator-based local development (dev:emulators, dev@taller.test)`, `npm scripts (dev, test, coverage, test:rules, test:e2e, lint, typecheck, build)`, `Quotes: only drafts deletable; sent cannot return to draft`, `Money in integer cents; percentages in basis points (10000 = 100%)`, `Offline support: installable PWA + Firestore local cache` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 356 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Tests de pantallas` to `Componentes UI base`, `Shell de la app y convenciones`, `Pantallas de billetera`, `Panel de la billetera`, `Autenticación y socios`, `Cálculo de presupuestos y PDF`, `Herramientas de desarrollo`, `Tests e2e (Playwright)`, `Geometría 3D de muebles`, `Tests de inicio`, `Esquemas de clientes y proyectos`, `Plantillas del Excel`, `Reparto y tests de reglas`, `Build con Vite y PWA`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **What connects `Emulator-based local development (dev:emulators, dev@taller.test)`, `npm scripts (dev, test, coverage, test:rules, test:e2e, lint, typecheck, build)`, `Quotes: only drafts deletable; sent cannot return to draft` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Componentes UI base` be split into smaller, more focused modules?**
  _Cohesion score 0.05561904761904762 - nodes in this community are weakly interconnected._
- **Why does `FakeDataApi` connect `Ajustes y API de prueba` to `Componentes UI base`, `Autenticación y socios`, `Tests de pantallas`, `Escrituras de DataApi`, `Tipos y altas de la API de prueba`, `Tipos de datos y orden`, `Arquitectura (CLAUDE.md)`, `Tests de inicio`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `Shell de la app y convenciones` be split into smaller, more focused modules?**
  _Cohesion score 0.0816386678455644 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `DataApi` and `src/data: DataApi, firestoreApi, repo, hooks`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `dashboard.ts` and `Panel de la billetera`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._