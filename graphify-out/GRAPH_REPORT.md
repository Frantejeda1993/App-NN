# Graph Report - App NN  (2026-11-13)

## Corpus Check
- 165 files · ~86,038 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 1, .rules 1)

## Summary
- 1263 nodes · 4239 edges · 45 communities (43 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- QuoteEditorPage.tsx
- hooks.ts
- generalExpenses.ts
- dashboard.ts
- AppShell.tsx
- quotePdf.ts
- devDependencies
- Tests e2e (Playwright)
- Tests de pantallas
- Escrituras de DataApi
- FakeDataApi
- Esquemas zod y auditoría
- Capa Firestore
- ProjectForm.tsx
- Dependencias de producción
- TS config de la app
- Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog)
- Geometría 3D de muebles
- Tipos de datos y orden
- TS config de Node
- main.tsx
- AuthProvider.tsx
- shopping.ts
- api.ts
- Datos de prueba del emulador
- domain/catalog.ts
- shared.ts
- Disparadores del deploy
- quote.ts
- Build con Vite y PWA
- Scripts npm
- eslint.config.js
- package.json
- downloadQuotePdf
- Jobs del CI
- Job de publicación en Pages
- overrides
- Pasos del CI
- Variables de Firebase en CI
- Parámetros de acciones del CI
- Dependabot
- Logo e íconos
- TS config raíz
- Desarrollo con emuladores

## God Nodes (most connected - your core abstractions)
1. `FakeDataApi` - 99 edges
2. `Button()` - 65 edges
3. `useData()` - 62 edges
4. `formatEuros()` - 60 edges
5. `DataApi` - 56 edges
6. `Card()` - 56 edges
7. `notifyError()` - 49 edges
8. `notifyWrite()` - 46 edges
9. `Input()` - 45 edges
10. `Editor()` - 44 edges

## Surprising Connections (you probably didn't know these)
- `src/data: DataApi, firestoreApi, repo, hooks` --references--> `DataApi`  [AMBIGUOUS]
  CLAUDE.md → src/data/api.ts
- `FakeDataApi debe comportarse como las reglas` --references--> `FakeDataApi`  [EXTRACTED]
  CLAUDE.md → src/test/fakeApi.ts
- `Dinero en centimos enteros y porcentajes en puntos basicos` --references--> `allocateByWeights()`  [EXTRACTED]
  CLAUDE.md → src/domain/percent.ts
- `firestore.rules as the only real security barrier` --semantically_similar_to--> `Firebase Spark without Cloud Functions: all logic client-side, security via rules`  [INFERRED] [semantically similar]
  README.md → docs/plan.md
- `Apple Touch Icon 180x180 (iOS home-screen icon, split black/walnut N mark)` --semantically_similar_to--> `In-App Logo (faceted N: black slate and walnut wood pieces)`  [INFERRED] [semantically similar]
  public/apple-touch-icon-180x180.png → src/assets/logo.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules-enforced security layer (whitelist, server audit fields, movement versioning, quote deletion)** — readme_firestore_rules_only_barrier, readme_members_whitelist, readme_server_audit_fields, readme_movement_versioning_auditlog, readme_quote_draft_deletion_rule [EXTRACTED 1.00]
- **Propagacion de un campo nuevo: zod, reglas, fake y tests** — claude_new_field_checklist, claude_model_layer, claude_firestore_rules, src_test_fakeapi_fakedataapi, claude_fake_data_api_parity [EXTRACTED 1.00]
- **Quote pricing pipeline (catalog -> item cost -> whole sheets -> totals)** — docs_plan_catalog, docs_plan_furniture_quote_item, docs_plan_furniture_cost_calculation, docs_plan_whole_sheet_rounding, docs_plan_quote_totals [EXTRACTED 1.00]
- **Wallet accounting (movements, money flow, partner balance, reintegro, dashboard)** — docs_plan_movements_collection, docs_plan_money_flow, docs_plan_partner_balance, docs_plan_out_of_pocket_reintegro, docs_plan_wallet_dashboard [EXTRACTED 1.00]
- **Endurecimiento del cliente estatico en GitHub Pages** — security_frame_guard, security_csp_plugin, security_safe_href, security_dev_login_guard, security_url_param_validation [INFERRED 0.75]
- **Integridad del dinero: centimos, movimientos versionados, auditLog y reglas** — claude_money_in_cents, claude_versioned_movements, security_strict_money_movements, security_firestore_rules_barrier, src_domain_percent_allocatebyweights [INFERRED 0.85]

## Communities (45 total, 2 thin omitted)

### Community 0 - "QuoteEditorPage.tsx"
Cohesion: 0.17
Nodes (25): Dialog(), MoneyInput(), ItemBreakdown, itemFromTemplate(), newLocalId(), ItemEdit, withEditedItem(), ACTION_LABELS (+17 more)

### Community 1 - "hooks.ts"
Cohesion: 0.06
Nodes (154): lucide-react, react, react-router-dom, AppRoutes(), Button(), ButtonProps, buttonVariants, Badge() (+146 more)

### Community 2 - "generalExpenses.ts"
Cohesion: 0.23
Nodes (8): dueFixedExpenses(), FixedExpenseLike, fixedExpenseStatus(), FixedStatus, monthKey(), MovementLike, alquiler, FIXED_STATUS_LABELS

### Community 3 - "dashboard.ts"
Cohesion: 0.10
Nodes (41): Panel de la billetera, ACCEPTED, acceptedAmount(), Allocation, allocations(), collectedByProject(), CollectionRow, DashboardInput (+33 more)

### Community 4 - "AppShell.tsx"
Cohesion: 0.11
Nodes (20): react-dom@^19.2.0, react-dom, Probe(), useAuth(), AppShell(), UserBadge(), Brand(), Logo() (+12 more)

### Community 5 - "quotePdf.ts"
Cohesion: 0.11
Nodes (17): QuoteTotals, eur(), pdfFileName(), PdfRow, PdfTotal, plural(), QuotePdfModel, quotePdfModel() (+9 more)

### Community 6 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, firebase-tools@^15.35.0, jsdom@^31.0.0, @playwright/test@1.64.1, tailwindcss@^4.3.5, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/node@^24.10.1 (+11 more)

### Community 7 - "Tests e2e (Playwright)"
Cohesion: 0.11
Nodes (25): deleteDoc(), DEV, euros(), fields(), headers, Json, kpi(), listDocs() (+17 more)

### Community 8 - "Tests de pantallas"
Cohesion: 0.11
Nodes (25): @testing-library/react, @testing-library/user-event, vitest, addDays(), daysBetween(), pad(), toUtcMs(), today (+17 more)

### Community 9 - "Escrituras de DataApi"
Cohesion: 0.05
Nodes (14): DataApi, WriteResult, EdgeBandingDataSchema, MaterialDataSchema, ClientData, ClientDataSchema, ContactDataSchema, ProjectData (+6 more)

### Community 10 - "FakeDataApi"
Cohesion: 0.07
Nodes (19): DistributionInput, Movement, OpeningState, ServiceRatesState, seedCatalog(), seedExpenses(), seed(), seed() (+11 more)

### Community 11 - "Esquemas zod y auditoría"
Cohesion: 0.06
Nodes (50): zod, HARDWARE_KIND_LABELS, HARDWARE_UNIT_LABELS, AUDIT_ACTIONS, AuditLog, AuditLogSchema, HARDWARE_KINDS, HARDWARE_UNITS (+42 more)

### Community 12 - "Capa Firestore"
Cohesion: 0.08
Nodes (37): firebase, createFirestoreDataApi(), onError(), StoredMovementSchema, toStored(), watchList(), addContact(), addMovementVersion() (+29 more)

### Community 13 - "ProjectForm.tsx"
Cohesion: 0.09
Nodes (36): Member, AlertableClient, contactAlerts(), lastTouch(), matchesSearch(), normalizeText(), whatsappLink(), equalShares() (+28 more)

### Community 14 - "Dependencias de producción"
Cohesion: 0.10
Nodes (20): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, firebase@^13.2.0, @hookform/resolvers@^7.0.3, lucide-react@^1.70.0, react@^19.2.0, react-hook-form@^7.91.0 (+12 more)

### Community 15 - "TS config de la app"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 16 - "Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog)"
Cohesion: 0.05
Nodes (47): settings/opening (saldos iniciales), 3D furniture viewer (three + @react-three/fiber, later phase), Audit fields + auditLog + movement soft delete, Catalog (materials, edgeBanding, hardware, services) with supplier and link, Contact alerts (nextContactAt overdue / N days) + WhatsApp button, Pure domain module src/domain/ (quote, balances, split calculations) with Vitest, Excel features incorporated (15 items: pending payments, waste factor, shopping list, shared purchases, multiplier...), Goal: replace Excel 'Calculo muebles presupuesto.xlsx' for 2-3 partners (+39 more)

### Community 17 - "Geometría 3D de muebles"
Cohesion: 0.09
Nodes (28): @react-three/drei@10.7.9, @react-three/fiber@9.8.1, @react-three/drei, @react-three/fiber, Box3, COLORS, furnitureBoxes(), ItemGeometry (+20 more)

### Community 18 - "Tipos de datos y orden"
Cohesion: 0.11
Nodes (11): AuditEntry, Box, byCreatedDesc(), byMovementDesc(), byName(), Client, GeneralExpense, Project (+3 more)

### Community 19 - "TS config de Node"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 20 - "main.tsx"
Cohesion: 0.06
Nodes (35): Comandos npm (dev, test, test:rules, test:e2e, lint, typecheck, build), src/data: DataApi, firestoreApi, repo, hooks, CI/CD a GitHub Pages en push a main, src/domain: logica pura testeada, Excel Calculo muebles presupuesto.xlsx, src/features/<area> y src/components/ui, firestore.rules (unica barrera de seguridad real), src/model: esquemas zod (COLLECTIONS, SETTINGS_DOCS) (+27 more)

### Community 21 - "AuthProvider.tsx"
Cohesion: 0.13
Nodes (13): nacho, setup(), AuthContext, AuthContextValue, AuthProvider(), AuthState, storage, extrano (+5 more)

### Community 22 - "shopping.ts"
Cohesion: 0.15
Nodes (13): formatQty(), KIND_ORDER, NO_SUPPLIER, orderText(), ShoppingCatalog, ShoppingGroup, ShoppingLine, shoppingList() (+5 more)

### Community 23 - "api.ts"
Cohesion: 0.13
Nodes (17): byDateDesc(), Contact, EdgeBanding, Hardware, Material, SettingsState, Template, Unsubscribe (+9 more)

### Community 24 - "Datos de prueba del emulador"
Cohesion: 0.20
Nodes (12): audit, fields(), geShares, headers, iso(), movement(), mvBase, pad() (+4 more)

### Community 25 - "domain/catalog.ts"
Cohesion: 0.10
Nodes (20): CatalogSeed, DB_MATERIALS, DEFAULT_SHEET, EXCEL_TEMPLATE_NAMES, EXCEL_TEMPLATES, excelSeed(), excelTemplates(), extra (+12 more)

### Community 26 - "shared.ts"
Cohesion: 0.14
Nodes (18): applyStatus(), canTransition(), fallbackAcceptedQuote(), isAcceptedStatus(), newQuoteInput(), newVersionInput(), nextStatuses(), projectPatchForQuote() (+10 more)

### Community 27 - "Disparadores del deploy"
Cohesion: 0.17
Nodes (11): concurrency, cancel-in-progress, group, name, on, pull_request, push, workflow_dispatch (+3 more)

### Community 28 - "quote.ts"
Cohesion: 0.19
Nodes (10): CatalogLike, computeQuote(), itemAreas(), ItemLike, m2(), PanelLike, RatesLike, SheetLine (+2 more)

### Community 29 - "Build con Vite y PWA"
Cohesion: 0.17
Nodes (9): @tailwindcss/vite@^4.3.5, vite@^7.3.1, vite-plugin-pwa@^2.0.0, @vitejs/plugin-react@^5.1.1, @tailwindcss/vite, vite, vite-plugin-pwa, @vitejs/plugin-react (+1 more)

### Community 30 - "Scripts npm"
Cohesion: 0.17
Nodes (12): scripts, build, coverage, dev, dev:emulators, lint, preview, test (+4 more)

### Community 31 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^9.39.1, @eslint/js@^9.39.1, eslint-plugin-react-hooks@^7.0.1, eslint-plugin-react-refresh@^0.4.24, globals@^16.5.0, typescript-eslint@^8.48.0, eslint, @eslint/js (+4 more)

### Community 32 - "package.json"
Cohesion: 0.15
Nodes (12): @firebase/rules-unit-testing@^6.0.0, @testing-library/jest-dom@^7.0.1, @types/react@^19.2.7, @types/three@0.186.0, name, private, type, version (+4 more)

### Community 33 - "downloadQuotePdf"
Cohesion: 0.33
Nodes (6): jspdf@4.2.1, jspdf-autotable@5.0.9, jspdf, jspdf-autotable, downloadQuotePdf(), toDataUrl()

### Community 34 - "Jobs del CI"
Cohesion: 0.20
Nodes (10): if, needs, runs-on, runs-on, runs-on, timeout-minutes, jobs, build (+2 more)

### Community 35 - "Job de publicación en Pages"
Cohesion: 0.20
Nodes (10): environment, if, needs, permissions, runs-on, name, url, deploy (+2 more)

### Community 36 - "overrides"
Cohesion: 0.67
Nodes (3): @grpc/grpc-js, overrides, @firebase/firestore

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

### Community 42 - "Logo e íconos"
Cohesion: 0.52
Nodes (7): App-NN Brand Mark (geometric N, black slate + walnut wood on cream), Apple Touch Icon 180x180 (iOS home-screen icon, split black/walnut N mark), Maskable PWA Icon 512x512 (padded safe-zone N mark), PWA Install Icon 192x192 (split black/walnut N mark), PWA Install Icon 512x512 (split black/walnut N mark), PWA Icon 64x64 (small favicon-size N mark), In-App Logo (faceted N: black slate and walnut wood pieces)

### Community 45 - "TS config raíz"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

## Ambiguous Edges - Review These
- `DataApi` → `src/data: DataApi, firestoreApi, repo, hooks`  [AMBIGUOUS]
  CLAUDE.md · relation: references
- `cspPlugin()` → `Content-Security-Policy por <meta> (cspPlugin)`  [AMBIGUOUS]
  SECURITY.md · relation: references
- `dashboard.ts` → `Panel de la billetera`  [AMBIGUOUS]
  CLAUDE.md · relation: references
- `firebase.ts` → `Login falso de desarrollo solo con import.meta.env.DEV`  [AMBIGUOUS]
  SECURITY.md · relation: references

## Knowledge Gaps
- **16 isolated node(s):** `index.html SPA entry (root div, loads /src/main.tsx)`, `Contact alerts (nextContactAt overdue / N days) + WhatsApp button`, `Quote totals: accepted items + free lines + justified adjustments; optional VAT`, `Money in integer cents; percentages in basis points (10000 = 100%)`, `Quotes: only drafts deletable; sent cannot return to draft` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 363 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FakeDataApi` connect `FakeDataApi` to `Tests de pantallas`, `Escrituras de DataApi`, `ProjectForm.tsx`, `Tipos de datos y orden`, `main.tsx`, `AuthProvider.tsx`, `api.ts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `index.html SPA entry (root div, loads /src/main.tsx)`, `Contact alerts (nextContactAt overdue / N days) + WhatsApp button`, `Quote totals: accepted items + free lines + justified adjustments; optional VAT` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hooks.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06431145627125527 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Tests de pantallas` to `package.json`, `generalExpenses.ts`, `dashboard.ts`, `quotePdf.ts`, `devDependencies`, `Tests e2e (Playwright)`, `Esquemas zod y auditoría`, `Capa Firestore`, `ProjectForm.tsx`, `Geometría 3D de muebles`, `main.tsx`, `AuthProvider.tsx`, `shopping.ts`, `api.ts`, `domain/catalog.ts`, `shared.ts`, `quote.ts`, `Build con Vite y PWA`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `dashboard.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `DataApi` and `src/data: DataApi, firestoreApi, repo, hooks`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `cspPlugin()` and `Content-Security-Policy por <meta> (cspPlugin)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._