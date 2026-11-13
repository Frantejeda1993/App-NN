# Graph Report - App NN  (2026-11-14)

## Corpus Check
- 167 files · ~87,756 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 1, .rules 1)

## Summary
- 1267 nodes · 4324 edges · 53 communities (49 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69641931`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- QuoteParts.tsx
- hooks.ts
- generalExpenses.ts
- dashboard.ts
- AuthProvider.tsx
- pdf.ts
- devDependencies
- support.ts
- vitest
- DataApi
- FakeDataApi
- index.ts
- firestoreApi.ts
- GeneralExpenseFormPage.tsx
- dependencies
- compilerOptions
- Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog)
- furniture3d.ts
- api.ts
- compilerOptions
- Button
- Plan: carpentry workshop management app
- ShoppingListCard.tsx
- Seguridad de Taller NN
- seed-emulator.mjs
- domain/catalog.ts
- QuoteEditorPage.tsx
- deploy.yml
- quote.ts
- vite.config.ts
- scripts
- eslint.config.js
- package.json
- setup
- jobs
- deploy
- todayIso
- steps
- env
- with
- updates
- .seedClient
- App-NN Brand Mark (geometric N, black slate + walnut wood on cream)
- MovementForm.tsx
- firestore.rules as the only real security barrier
- tsconfig.json
- Emulator-based local development (dev:emulators, dev@taller.test)
- Taller NN - guia para Claude
- Implementation steps 1-14
- src/domain: logica pura testeada
- Step 1: project base, Google login, layout, deploy
- Tabla de protecciones (riesgo / proteccion / prueba)

## God Nodes (most connected - your core abstractions)
1. `FakeDataApi` - 102 edges
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
- `Ediciones simultaneas con contador rev` --references--> `updateWithRev()`  [INFERRED]
  SECURITY.md → src/data/repo.ts
- `Dinero en centimos enteros y porcentajes en puntos basicos` --references--> `allocateByWeights()`  [EXTRACTED]
  CLAUDE.md → src/domain/percent.ts
- `FakeDataApi debe comportarse como las reglas` --references--> `FakeDataApi`  [EXTRACTED]
  CLAUDE.md → src/test/fakeApi.ts
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

## Communities (53 total, 4 thin omitted)

### Community 0 - "QuoteParts.tsx"
Cohesion: 0.27
Nodes (9): ItemBreakdown, ItemEdit, plural(), QuoteItemRow(), QuoteItemRowProps, Adjustment, Breakdown(), FreeLine (+1 more)

### Community 1 - "hooks.ts"
Cohesion: 0.06
Nodes (152): @hookform/resolvers, lucide-react, react-hook-form, react-router-dom, AppRoutes(), buttonVariants, Badge(), Card() (+144 more)

### Community 2 - "generalExpenses.ts"
Cohesion: 0.27
Nodes (7): dueFixedExpenses(), FixedExpenseLike, fixedExpenseStatus(), FixedStatus, monthKey(), MovementLike, alquiler

### Community 3 - "dashboard.ts"
Cohesion: 0.10
Nodes (38): Panel de la billetera, ACCEPTED, acceptedAmount(), Allocation, allocations(), collectedByProject(), CollectionRow, DashboardInput (+30 more)

### Community 4 - "AuthProvider.tsx"
Cohesion: 0.05
Nodes (36): AuthContext, AuthContextValue, AuthState, storage, extrano, nacho, Probe(), useAuth() (+28 more)

### Community 5 - "pdf.ts"
Cohesion: 0.17
Nodes (9): jspdf@4.2.1, jspdf-autotable@5.0.9, jspdf, jspdf-autotable, downloadQuotePdf(), INK, MUTED, toDataUrl() (+1 more)

### Community 6 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, @firebase/rules-unit-testing@^6.0.0, firebase-tools@^15.35.0, jsdom@^31.0.0, @playwright/test@1.64.1, tailwindcss@^4.3.5, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3 (+13 more)

### Community 7 - "support.ts"
Cohesion: 0.11
Nodes (25): deleteDoc(), DEV, euros(), fields(), headers, Json, kpi(), listDocs() (+17 more)

### Community 8 - "vitest"
Cohesion: 0.13
Nodes (17): @testing-library/react, @testing-library/user-event, vitest, nacho, setup(), AuthProvider(), DataProvider(), SHARES (+9 more)

### Community 9 - "DataApi"
Cohesion: 0.05
Nodes (13): DataApi, WriteResult, EdgeBandingDataSchema, HardwareDataSchema, ClientData, ContactDataSchema, UserPrefs, QuoteDataSchema (+5 more)

### Community 10 - "FakeDataApi"
Cohesion: 0.10
Nodes (4): Movement, seed(), newUser(), FakeDataApi

### Community 11 - "index.ts"
Cohesion: 0.07
Nodes (48): zod, WORKSHOP_SHARE_KEY, HARDWARE_KIND_LABELS, HARDWARE_UNIT_LABELS, AUDIT_ACTIONS, AuditLog, AuditLogSchema, HARDWARE_KINDS (+40 more)

### Community 12 - "firestoreApi.ts"
Cohesion: 0.13
Nodes (33): firebase, createFirestoreDataApi(), onError(), StoredMovementSchema, toStored(), watchList(), addContact(), addMovementVersion() (+25 more)

### Community 13 - "GeneralExpenseFormPage.tsx"
Cohesion: 0.08
Nodes (43): Member, AlertableClient, lastTouch(), matchesSearch(), normalizeText(), whatsappLink(), centsToEuros(), eurFormatter (+35 more)

### Community 14 - "dependencies"
Cohesion: 0.08
Nodes (26): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, firebase@^13.2.0, @fontsource/calistoga@^5.3.0, @fontsource-variable/inter@^5.3.0, @hookform/resolvers@^7.0.3, lucide-react@^1.70.0 (+18 more)

### Community 15 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 16 - "Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog)"
Cohesion: 0.14
Nodes (18): Catalog (materials, edgeBanding, hardware, services) with supplier and link, Contact alerts (nextContactAt overdue / N days) + WhatsApp button, Pure domain module src/domain/ (quote, balances, split calculations) with Vitest, Excel features incorporated (15 items: pending payments, waste factor, shopping list, shared purchases, multiplier...), Firestore data model (members, settings/workshop, clients, contacts, projects, boxes, movements, generalExpenses, catalog/*, templates, quotes, auditLog), Money as integer EUR cents, never floats, Money flow: sent/accepted quotes as future income, cobro into boxes, movements collection (cobro, gasto_proyecto, gasto_general, retiro, aporte, transferencia, reintegro) (+10 more)

### Community 17 - "furniture3d.ts"
Cohesion: 0.11
Nodes (22): three@0.186.1, three, Box3, COLORS, furnitureBoxes(), ItemGeometry, LaidOutItem, layoutItems() (+14 more)

### Community 18 - "api.ts"
Cohesion: 0.07
Nodes (37): AuditEntry, Box, byCreatedDesc(), byDateDesc(), byMovementDesc(), byName(), Client, Contact (+29 more)

### Community 19 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 20 - "Button"
Cohesion: 0.18
Nodes (20): react, Button(), ButtonProps, Dialog(), MoneyInput(), Furniture3D, Furniture3DView(), Geometry (+12 more)

### Community 21 - "Plan: carpentry workshop management app"
Cohesion: 0.40
Nodes (5): Goal: replace Excel 'Calculo muebles presupuesto.xlsx' for 2-3 partners, Plan: carpentry workshop management app, index.html SPA entry (root div, loads /src/main.tsx), Taller NN (carpentry workshop management app), Stack: React + TypeScript + Vite, Tailwind, Firebase Spark, GitHub Pages

### Community 22 - "ShoppingListCard.tsx"
Cohesion: 0.17
Nodes (14): formatQty(), KIND_ORDER, NO_SUPPLIER, orderText(), ShoppingCatalog, ShoppingGroup, ShoppingLine, shoppingList (+6 more)

### Community 23 - "Seguridad de Taller NN"
Cohesion: 0.18
Nodes (8): src/data: DataApi, firestoreApi, repo, hooks, firestore.rules (unica barrera de seguridad real), src/model: esquemas zod (COLLECTIONS, SETTINGS_DOCS), Checklist de la consola Firebase/Google Cloud, Vigilancia en vivo del socio desactivado (cierra sesion y borra cache), Acceso: Google con email verificado + members/{email} active, safeHref: solo enlaces http(s) en catalogo, Seguridad de Taller NN

### Community 24 - "seed-emulator.mjs"
Cohesion: 0.20
Nodes (12): audit, fields(), geShares, headers, iso(), movement(), mvBase, pad() (+4 more)

### Community 25 - "domain/catalog.ts"
Cohesion: 0.11
Nodes (17): ServiceRatesState, CatalogSeed, DB_MATERIALS, DEFAULT_SHEET, EXCEL_TEMPLATE_NAMES, EXCEL_TEMPLATES, excelSeed(), extra (+9 more)

### Community 26 - "QuoteEditorPage.tsx"
Cohesion: 0.17
Nodes (23): applyStatus(), canTransition(), fallbackAcceptedQuote(), isAcceptedStatus(), itemFromTemplate(), newLocalId(), newQuoteInput(), newVersionInput() (+15 more)

### Community 27 - "deploy.yml"
Cohesion: 0.17
Nodes (11): concurrency, cancel-in-progress, group, name, permissions, contents, branches, True (+3 more)

### Community 28 - "quote.ts"
Cohesion: 0.12
Nodes (20): CatalogLike, computeQuote(), itemAreas(), ItemLike, m2(), PanelLike, QuoteTotals, RatesLike (+12 more)

### Community 29 - "vite.config.ts"
Cohesion: 0.17
Nodes (9): @tailwindcss/vite@^4.3.5, vite@^7.3.1, vite-plugin-pwa@^2.0.0, @vitejs/plugin-react@^5.1.1, @tailwindcss/vite, vite, vite-plugin-pwa, @vitejs/plugin-react (+1 more)

### Community 30 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, coverage, dev, dev:emulators, lint, preview, test (+4 more)

### Community 31 - "eslint.config.js"
Cohesion: 0.15
Nodes (12): eslint@^9.39.1, @eslint/js@^9.39.1, eslint-plugin-react-hooks@^7.0.1, eslint-plugin-react-refresh@^0.4.24, globals@^16.5.0, typescript-eslint@^8.48.0, eslint, @eslint/js (+4 more)

### Community 32 - "package.json"
Cohesion: 0.14
Nodes (13): @types/react@^19.2.7, @types/three@0.186.0, typescript@~5.9.3, @grpc/grpc-js, name, overrides, @firebase/firestore, private (+5 more)

### Community 34 - "jobs"
Cohesion: 0.20
Nodes (10): if, needs, runs-on, runs-on, runs-on, timeout-minutes, jobs, build (+2 more)

### Community 35 - "deploy"
Cohesion: 0.20
Nodes (10): environment, if, needs, permissions, runs-on, name, url, deploy (+2 more)

### Community 36 - "todayIso"
Cohesion: 0.18
Nodes (13): addDays(), daysBetween(), pad(), todayIso(), toUtcMs(), today, ContactFormSchema, SHARES (+5 more)

### Community 37 - "steps"
Cohesion: 0.31
Nodes (9): steps, steps, steps, steps, id, if, name, run (+1 more)

### Community 38 - "env"
Cohesion: 0.22
Nodes (9): CI, VITE_BASE, VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET (+1 more)

### Community 39 - "with"
Cohesion: 0.22
Nodes (9): with, cache, distribution, java-version, name, node-version, path, persist-credentials (+1 more)

### Community 40 - "updates"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 41 - ".seedClient"
Cohesion: 0.21
Nodes (8): withAdmin(), seedExpenses(), seed(), seed(), seed(), seed(), seed(), ProjectData

### Community 42 - "App-NN Brand Mark (geometric N, black slate + walnut wood on cream)"
Cohesion: 0.52
Nodes (7): App-NN Brand Mark (geometric N, black slate + walnut wood on cream), Apple Touch Icon 180x180 (iOS home-screen icon, split black/walnut N mark), Maskable PWA Icon 512x512 (padded safe-zone N mark), PWA Install Icon 192x192 (split black/walnut N mark), PWA Install Icon 512x512 (split black/walnut N mark), PWA Icon 64x64 (small favicon-size N mark), In-App Logo (faceted N: black slate and walnut wood pieces)

### Community 43 - "MovementForm.tsx"
Cohesion: 0.21
Nodes (9): ACTION_LABELS, FIELD_LABELS, FORM_TYPES, TYPE_LABELS, SHOWN_INLINE, SplitRow, MEMBER_MOVEMENT_TYPES, MovementDataSchema (+1 more)

### Community 44 - "firestore.rules as the only real security barrier"
Cohesion: 0.20
Nodes (7): settings/opening (saldos iniciales), Audit fields + auditLog + movement soft delete, Movement soft delete + versioning with auditLog/{id}_v{n} and conflict detection, Quotes: only drafts deletable; sent cannot return to draft, Server-set audit fields createdBy/createdAt/updatedBy/updatedAt, Client-side zod validation (src/model), App Check + reCAPTCHA v3 (pendiente opcional)

### Community 45 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 47 - "Taller NN - guia para Claude"
Cohesion: 0.22
Nodes (8): Comandos npm (dev, test, test:rules, test:e2e, lint, typecheck, build), CI/CD a GitHub Pages en push a main, Excel Calculo muebles presupuesto.xlsx, Taller NN app (gestion de taller de carpinteria), Taller NN - guia para Claude, Stack: React 19 + TS + Vite + Tailwind + zod + Firebase (Spark) + PWA + GitHub Pages, Acciones del CI fijadas por SHA + Dependabot, Suites de prueba (unit, rules, e2e) en CI

### Community 48 - "Implementation steps 1-14"
Cohesion: 0.24
Nodes (10): 3D furniture viewer (three + @react-three/fiber, later phase), Per-furniture cost calculation (m2 structure/doors/back x price x waste factor + cutting + hardware), Quote item (furniture): dimensions, materials, doors, drawers, hardware, manual labor, geometry for 3D, Implementation steps 1-14, PDF generation in browser with @react-pdf/renderer, Step 10: quote PDF, Step 12: Playwright e2e of main flow (login to wallet), Step 13: security audit of Firestore rules and login (+2 more)

### Community 51 - "Step 1: project base, Google login, layout, deploy"
Cohesion: 0.29
Nodes (7): React Router HashRouter, Firestore persistentLocalCache (basic offline support), Step 1: project base, Google login, layout, deploy, CI/CD: push to main runs lint, typecheck, tests, rules tests then deploys to GitHub Pages, members/{email} whitelist (lowercase id, active: true), Offline support: installable PWA + Firestore local cache, One-time setup (Firebase Auth, members collection, rules deploy, GitHub variables, Pages)

### Community 52 - "Tabla de protecciones (riesgo / proteccion / prueba)"
Cohesion: 0.33
Nodes (7): Content-Security-Policy por <meta> (cspPlugin), npm audit --omit=dev (grpc-js forzado), Login falso de desarrollo solo con import.meta.env.DEV, frameGuard: no arranca dentro de un marco (clickjacking), Tabla de protecciones (riesgo / proteccion / prueba), Parametros de URL acotados (MovementNewPage), userPrefs aisladas por socio

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
- **16 isolated node(s):** `index.html SPA entry (root div, loads /src/main.tsx)`, `Contact alerts (nextContactAt overdue / N days) + WhatsApp button`, `Quote totals: accepted items + free lines + justified adjustments; optional VAT`, `Money in integer cents; percentages in basis points (10000 = 100%)`, `Quotes: only drafts deletable; sent cannot return to draft` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 358 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `package.json`, `generalExpenses.ts`, `dashboard.ts`, `AuthProvider.tsx`, `todayIso`, `devDependencies`, `support.ts`, `index.ts`, `firestoreApi.ts`, `GeneralExpenseFormPage.tsx`, `furniture3d.ts`, `Button`, `ShoppingListCard.tsx`, `domain/catalog.ts`, `QuoteEditorPage.tsx`, `quote.ts`, `vite.config.ts`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `index.html SPA entry (root div, loads /src/main.tsx)`, `Contact alerts (nextContactAt overdue / N days) + WhatsApp button`, `Quote totals: accepted items + free lines + justified adjustments; optional VAT` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hooks.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05942357512953368 - nodes in this community are weakly interconnected._
- **Why does `FakeDataApi` connect `FakeDataApi` to `setup`, `todayIso`, `vitest`, `.seedClient`, `DataApi`, `GeneralExpenseFormPage.tsx`, `api.ts`, `Seguridad de Taller NN`, `domain/catalog.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `dashboard.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10338164251207729 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `DataApi` and `src/data: DataApi, firestoreApi, repo, hooks`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `dashboard.ts` and `Panel de la billetera`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._