# Graph Report - App NN  (2026-11-13)

## Corpus Check
- 166 files · ~86,891 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 1, .rules 1)

## Summary
- 1294 nodes · 4311 edges · 56 communities (52 shown, 4 thin omitted)
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
- projects.ts
- Dependencias de producción
- TS config de la app
- Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog)
- Geometría 3D de muebles
- api.ts
- TS config de Node
- main.tsx
- AuthService
- shopping.ts
- Seguridad de Taller NN
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
- dates.ts
- Pasos del CI
- Variables de Firebase en CI
- Parámetros de acciones del CI
- Dependabot
- .seedClient
- Logo e íconos
- MovementForm.tsx
- firestore.rules as the only real security barrier
- TS config raíz
- Desarrollo con emuladores
- Taller NN - guia para Claude
- Implementation steps 1-14
- clients.ts
- Step 1: project base, Google login, layout, deploy
- Tabla de protecciones (riesgo / proteccion / prueba)
- money.test.ts
- catalog/labels.ts
- AuthContextValue

## God Nodes (most connected - your core abstractions)
1. `FakeDataApi` - 99 edges
2. `Button()` - 65 edges
3. `useData()` - 62 edges
4. `formatEuros()` - 60 edges
5. `Card()` - 56 edges
6. `DataApi` - 56 edges
7. `notifyError()` - 49 edges
8. `notifyWrite()` - 46 edges
9. `cn()` - 46 edges
10. `Input()` - 45 edges

## Surprising Connections (you probably didn't know these)
- `src/data: DataApi, firestoreApi, repo, hooks` --references--> `DataApi`  [AMBIGUOUS]
  CLAUDE.md → src/data/api.ts
- `FakeDataApi debe comportarse como las reglas` --references--> `FakeDataApi`  [EXTRACTED]
  CLAUDE.md → src/test/fakeApi.ts
- `Ediciones simultaneas con contador rev` --references--> `updateWithRev()`  [INFERRED]
  SECURITY.md → src/data/repo.ts
- `Dinero en centimos enteros y porcentajes en puntos basicos` --references--> `allocateByWeights()`  [EXTRACTED]
  CLAUDE.md → src/domain/percent.ts
- `firestore.rules as the only real security barrier` --semantically_similar_to--> `Firebase Spark without Cloud Functions: all logic client-side, security via rules`  [INFERRED] [semantically similar]
  README.md → docs/plan.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules-enforced security layer (whitelist, server audit fields, movement versioning, quote deletion)** — readme_firestore_rules_only_barrier, readme_members_whitelist, readme_server_audit_fields, readme_movement_versioning_auditlog, readme_quote_draft_deletion_rule [EXTRACTED 1.00]
- **Propagacion de un campo nuevo: zod, reglas, fake y tests** — claude_new_field_checklist, claude_model_layer, claude_firestore_rules, src_test_fakeapi_fakedataapi, claude_fake_data_api_parity [EXTRACTED 1.00]
- **Quote pricing pipeline (catalog -> item cost -> whole sheets -> totals)** — docs_plan_catalog, docs_plan_furniture_quote_item, docs_plan_furniture_cost_calculation, docs_plan_whole_sheet_rounding, docs_plan_quote_totals [EXTRACTED 1.00]
- **Wallet accounting (movements, money flow, partner balance, reintegro, dashboard)** — docs_plan_movements_collection, docs_plan_money_flow, docs_plan_partner_balance, docs_plan_out_of_pocket_reintegro, docs_plan_wallet_dashboard [EXTRACTED 1.00]
- **Endurecimiento del cliente estatico en GitHub Pages** — security_frame_guard, security_csp_plugin, security_safe_href, security_dev_login_guard, security_url_param_validation [INFERRED 0.75]
- **Integridad del dinero: centimos, movimientos versionados, auditLog y reglas** — claude_money_in_cents, claude_versioned_movements, security_strict_money_movements, security_firestore_rules_barrier, src_domain_percent_allocatebyweights [INFERRED 0.85]

## Communities (56 total, 4 thin omitted)

### Community 0 - "QuoteEditorPage.tsx"
Cohesion: 0.13
Nodes (23): Dialog(), ItemBreakdown, QuoteTotals, itemFromTemplate(), newLocalId(), ItemEdit, withEditedItem(), ACTION_LABELS (+15 more)

### Community 1 - "hooks.ts"
Cohesion: 0.05
Nodes (164): @hookform/resolvers, lucide-react, react, react-hook-form, react-router-dom, AppRoutes(), Button(), ButtonProps (+156 more)

### Community 2 - "generalExpenses.ts"
Cohesion: 0.23
Nodes (8): dueFixedExpenses(), FixedExpenseLike, fixedExpenseStatus(), FixedStatus, monthKey(), MovementLike, alquiler, FIXED_STATUS_LABELS

### Community 3 - "dashboard.ts"
Cohesion: 0.08
Nodes (47): settings/opening (saldos iniciales), Panel de la billetera, ACCEPTED, acceptedAmount(), Allocation, allocations(), collectedByProject(), CollectionRow (+39 more)

### Community 4 - "AppShell.tsx"
Cohesion: 0.12
Nodes (19): react-dom@^19.2.0, react-dom, useAuth(), AppShell(), UserBadge(), Brand(), Logo(), NAV_ITEMS (+11 more)

### Community 5 - "quotePdf.ts"
Cohesion: 0.12
Nodes (15): eur(), pdfFileName(), PdfRow, PdfTotal, plural(), QuotePdfModel, quotePdfModel(), catalog (+7 more)

### Community 6 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, firebase-tools@^15.35.0, jsdom@^31.0.0, @playwright/test@1.64.1, tailwindcss@^4.3.5, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+13 more)

### Community 7 - "Tests e2e (Playwright)"
Cohesion: 0.11
Nodes (25): deleteDoc(), DEV, euros(), fields(), headers, Json, kpi(), listDocs() (+17 more)

### Community 8 - "Tests de pantallas"
Cohesion: 0.10
Nodes (26): @testing-library/react, @testing-library/user-event, vitest, nacho, setup(), AuthContext, AuthProvider(), AuthState (+18 more)

### Community 9 - "Escrituras de DataApi"
Cohesion: 0.05
Nodes (14): DataApi, WriteResult, HardwareDataSchema, ClientData, ClientDataSchema, ContactDataSchema, ProjectDataSchema, UserPrefs (+6 more)

### Community 10 - "FakeDataApi"
Cohesion: 0.09
Nodes (5): Movement, seedCatalog(), newUser(), ProjectData, FakeDataApi

### Community 11 - "Esquemas zod y auditoría"
Cohesion: 0.07
Nodes (48): zod, AUDIT_ACTIONS, AuditLog, AuditLogSchema, ServiceRatesSchema, supplierFields, AuditFieldsSchema, bpSchema (+40 more)

### Community 12 - "Capa Firestore"
Cohesion: 0.10
Nodes (32): firebase, createFirestoreDataApi(), onError(), StoredMovementSchema, toStored(), watchList(), addContact(), addMovementVersion() (+24 more)

### Community 13 - "projects.ts"
Cohesion: 0.14
Nodes (20): DISTRIBUTION_CATEGORY, equalShares(), scaleRound(), allocateByShares(), allocateByWeights(), bpToPercent(), formatPercent(), FULL_SHARE_BP (+12 more)

### Community 14 - "Dependencias de producción"
Cohesion: 0.08
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, firebase@^13.2.0, @fontsource/calistoga@^5.3.0, @fontsource-variable/inter@^5.3.0, @hookform/resolvers@^7.0.3, lucide-react@^1.70.0 (+16 more)

### Community 15 - "TS config de la app"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 16 - "Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog)"
Cohesion: 0.11
Nodes (22): Catalog (materials, edgeBanding, hardware, services) with supplier and link, Contact alerts (nextContactAt overdue / N days) + WhatsApp button, Pure domain module src/domain/ (quote, balances, split calculations) with Vitest, Excel features incorporated (15 items: pending payments, waste factor, shopping list, shared purchases, multiplier...), Goal: replace Excel 'Calculo muebles presupuesto.xlsx' for 2-3 partners, Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog), Money as integer EUR cents, never floats, Money flow: sent/accepted quotes as future income, cobro into boxes (+14 more)

### Community 17 - "Geometría 3D de muebles"
Cohesion: 0.09
Nodes (27): three@0.186.1, three, Box3, COLORS, furnitureBoxes(), ItemGeometry, LaidOutItem, layoutItems() (+19 more)

### Community 18 - "api.ts"
Cohesion: 0.07
Nodes (30): AuditEntry, Box, byCreatedDesc(), byDateDesc(), byMovementDesc(), byName(), Client, Contact (+22 more)

### Community 19 - "TS config de Node"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 20 - "main.tsx"
Cohesion: 0.20
Nodes (10): createFirebaseAuthService(), isActiveMember(), memberKey(), MemberDoc, config, getFirebase(), missingFirebaseEnv, useEmulators (+2 more)

### Community 22 - "shopping.ts"
Cohesion: 0.15
Nodes (15): formatQty(), KIND_ORDER, NO_SUPPLIER, orderText(), ShoppingCatalog, ShoppingGroup, ShoppingLine, ShoppingList (+7 more)

### Community 23 - "Seguridad de Taller NN"
Cohesion: 0.15
Nodes (10): src/data: DataApi, firestoreApi, repo, hooks, src/domain: logica pura testeada, src/features/<area> y src/components/ui, firestore.rules (unica barrera de seguridad real), src/model: esquemas zod (COLLECTIONS, SETTINGS_DOCS), Checklist de la consola Firebase/Google Cloud, Vigilancia en vivo del socio desactivado (cierra sesion y borra cache), Acceso: Google con email verificado + members/{email} active (+2 more)

### Community 24 - "Datos de prueba del emulador"
Cohesion: 0.20
Nodes (12): audit, fields(), geShares, headers, iso(), movement(), mvBase, pad() (+4 more)

### Community 25 - "domain/catalog.ts"
Cohesion: 0.11
Nodes (18): CatalogSeed, DB_MATERIALS, DEFAULT_SHEET, EXCEL_TEMPLATE_NAMES, EXCEL_TEMPLATES, excelSeed(), excelTemplates(), extra (+10 more)

### Community 26 - "shared.ts"
Cohesion: 0.14
Nodes (18): applyStatus(), canTransition(), fallbackAcceptedQuote(), isAcceptedStatus(), newQuoteInput(), newVersionInput(), nextStatuses(), projectPatchForQuote() (+10 more)

### Community 27 - "Disparadores del deploy"
Cohesion: 0.17
Nodes (11): concurrency, cancel-in-progress, group, name, on, pull_request, push, workflow_dispatch (+3 more)

### Community 28 - "quote.ts"
Cohesion: 0.21
Nodes (9): CatalogLike, computeQuote(), itemAreas(), ItemLike, m2(), PanelLike, RatesLike, SheetLine (+1 more)

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
Cohesion: 0.14
Nodes (13): @firebase/rules-unit-testing@^6.0.0, @types/three@0.186.0, typescript@~5.9.3, @grpc/grpc-js, name, overrides, @firebase/firestore, private (+5 more)

### Community 33 - "downloadQuotePdf"
Cohesion: 0.33
Nodes (6): jspdf@4.2.1, jspdf-autotable@5.0.9, jspdf, jspdf-autotable, downloadQuotePdf(), toDataUrl()

### Community 34 - "Jobs del CI"
Cohesion: 0.20
Nodes (10): if, needs, runs-on, runs-on, runs-on, timeout-minutes, jobs, build (+2 more)

### Community 35 - "Job de publicación en Pages"
Cohesion: 0.20
Nodes (10): environment, if, needs, permissions, runs-on, name, url, deploy (+2 more)

### Community 36 - "dates.ts"
Cohesion: 0.19
Nodes (12): addDays(), daysBetween(), pad(), toUtcMs(), SHARES, today, seed(), SHARES (+4 more)

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

### Community 41 - ".seedClient"
Cohesion: 0.32
Nodes (6): seedExpenses(), seed(), setup(), seed(), seed(), seed()

### Community 42 - "Logo e íconos"
Cohesion: 0.52
Nodes (7): App-NN Brand Mark (geometric N, black slate + walnut wood on cream), Apple Touch Icon 180x180 (iOS home-screen icon, split black/walnut N mark), Maskable PWA Icon 512x512 (padded safe-zone N mark), PWA Install Icon 192x192 (split black/walnut N mark), PWA Install Icon 512x512 (split black/walnut N mark), PWA Icon 64x64 (small favicon-size N mark), In-App Logo (faceted N: black slate and walnut wood pieces)

### Community 43 - "MovementForm.tsx"
Cohesion: 0.21
Nodes (9): ACTION_LABELS, FIELD_LABELS, FORM_TYPES, TYPE_LABELS, SHOWN_INLINE, SplitRow, MEMBER_MOVEMENT_TYPES, MovementDataSchema (+1 more)

### Community 44 - "firestore.rules as the only real security barrier"
Cohesion: 0.20
Nodes (7): Audit fields + auditLog + movement soft delete, Step 2: data model, Firestore rules, domain module, Movement soft delete + versioning with auditLog/{id}_v{n} and conflict detection, Quotes: only drafts deletable; sent cannot return to draft, Server-set audit fields createdBy/createdAt/updatedBy/updatedAt, Client-side zod validation (src/model), App Check + reCAPTCHA v3 (pendiente opcional)

### Community 45 - "TS config raíz"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 47 - "Taller NN - guia para Claude"
Cohesion: 0.22
Nodes (8): Comandos npm (dev, test, test:rules, test:e2e, lint, typecheck, build), CI/CD a GitHub Pages en push a main, Excel Calculo muebles presupuesto.xlsx, Taller NN app (gestion de taller de carpinteria), Taller NN - guia para Claude, Stack: React 19 + TS + Vite + Tailwind + zod + Firebase (Spark) + PWA + GitHub Pages, Acciones del CI fijadas por SHA + Dependabot, Suites de prueba (unit, rules, e2e) en CI

### Community 48 - "Implementation steps 1-14"
Cohesion: 0.24
Nodes (10): 3D furniture viewer (three + @react-three/fiber, later phase), Per-furniture cost calculation (m2 structure/doors/back x price x waste factor + cutting + hardware), Quote item (furniture): dimensions, materials, doors, drawers, hardware, manual labor, geometry for 3D, Implementation steps 1-14, PDF generation in browser with @react-pdf/renderer, Step 10: quote PDF, Step 12: Playwright e2e of main flow (login to wallet), Step 13: security audit of Firestore rules and login (+2 more)

### Community 50 - "clients.ts"
Cohesion: 0.42
Nodes (5): AlertableClient, contactAlerts(), lastTouch(), matchesSearch(), normalizeText()

### Community 51 - "Step 1: project base, Google login, layout, deploy"
Cohesion: 0.29
Nodes (7): React Router HashRouter, Firestore persistentLocalCache (basic offline support), Step 1: project base, Google login, layout, deploy, CI/CD: push to main runs lint, typecheck, tests, rules tests then deploys to GitHub Pages, members/{email} whitelist (lowercase id, active: true), Offline support: installable PWA + Firestore local cache, One-time setup (Firebase Auth, members collection, rules deploy, GitHub variables, Pages)

### Community 52 - "Tabla de protecciones (riesgo / proteccion / prueba)"
Cohesion: 0.33
Nodes (7): Content-Security-Policy por <meta> (cspPlugin), npm audit --omit=dev (grpc-js forzado), Login falso de desarrollo solo con import.meta.env.DEV, frameGuard: no arranca dentro de un marco (clickjacking), Tabla de protecciones (riesgo / proteccion / prueba), Parametros de URL acotados (MovementNewPage), userPrefs aisladas por socio

### Community 53 - "money.test.ts"
Cohesion: 0.40
Nodes (3): centsToEuros(), eurosToCents(), sumCents()

### Community 54 - "catalog/labels.ts"
Cohesion: 0.40
Nodes (4): HARDWARE_KIND_LABELS, HARDWARE_UNIT_LABELS, HARDWARE_KINDS, HARDWARE_UNITS

## Ambiguous Edges - Review These
- `cspPlugin()` → `Content-Security-Policy por <meta> (cspPlugin)`  [AMBIGUOUS]
  SECURITY.md · relation: references
- `DataApi` → `src/data: DataApi, firestoreApi, repo, hooks`  [AMBIGUOUS]
  CLAUDE.md · relation: references
- `firebase.ts` → `Login falso de desarrollo solo con import.meta.env.DEV`  [AMBIGUOUS]
  SECURITY.md · relation: references
- `dashboard.ts` → `Panel de la billetera`  [AMBIGUOUS]
  CLAUDE.md · relation: references

## Knowledge Gaps
- **16 isolated node(s):** `index.html SPA entry (root div, loads /src/main.tsx)`, `Contact alerts (nextContactAt overdue / N days) + WhatsApp button`, `Quote totals: accepted items + free lines + justified adjustments; optional VAT`, `PDF generation in browser with @react-pdf/renderer`, `Step 12: Playwright e2e of main flow (login to wallet)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 383 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FakeDataApi` connect `FakeDataApi` to `dates.ts`, `Tests de pantallas`, `.seedClient`, `Escrituras de DataApi`, `api.ts`, `Seguridad de Taller NN`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `index.html SPA entry (root div, loads /src/main.tsx)`, `Contact alerts (nextContactAt overdue / N days) + WhatsApp button`, `Quote totals: accepted items + free lines + justified adjustments; optional VAT` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `QuoteEditorPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Why does `DataApi` connect `Escrituras de DataApi` to `hooks.ts`, `FakeDataApi`, `MovementForm.tsx`, `Capa Firestore`, `api.ts`, `Seguridad de Taller NN`, `domain/catalog.ts`, `shared.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `hooks.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052857414087715965 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `cspPlugin()` and `Content-Security-Policy por <meta> (cspPlugin)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `DataApi` and `src/data: DataApi, firestoreApi, repo, hooks`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._