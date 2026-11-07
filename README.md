# Taller NN

Gestión del taller de carpintería: clientes, proyectos, billetera y presupuestos.
Plan completo en [docs/plan.md](docs/plan.md).

**Stack:** React + TypeScript + Vite · Tailwind CSS · Firebase (Auth con Google + Firestore, plan Spark) · GitHub Pages.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con la config web de Firebase
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests unitarios y de componentes (Vitest) |
| `npm run coverage` | Tests con cobertura |
| `npm run test:rules` | Tests de `firestore.rules` contra el emulador (requiere Java 21+) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` | Build de producción en `dist/` |

## Puesta en marcha (una sola vez)

1. **Firebase → Authentication → Sign-in method:** Google habilitado.
2. **Firebase → Authentication → Settings → Authorized domains:** agregar `frantejeda1993.github.io` (y `localhost` para desarrollo).
3. **Firebase → Firestore → Datos:** crear la colección `members` con un documento por socio.
   - **ID del documento:** el email de Google en minúsculas, por ejemplo `nombre@gmail.com`.
   - **Campos:** `name` (string) y `active` (boolean, `true`).

   Solo los emails con `active: true` pueden entrar. Los socios se agregan **solo desde la consola**: la app no puede escribir en `members`.
4. **Publicar las reglas de Firestore** (cada vez que cambie `firestore.rules`):
   ```bash
   npx firebase login
   npx firebase deploy --only firestore:rules
   ```
5. **GitHub → Settings → Secrets and variables → Actions → Variables:** crear `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` y `VITE_FIREBASE_APP_ID`, con los mismos valores que `.env.local`.
6. **GitHub → Settings → Pages → Source:** *GitHub Actions*.

Cada push a `main` corre lint, typecheck y tests (incluidas las reglas), y si todo pasa publica en
`https://frantejeda1993.github.io/App-NN/`.

## Sin conexión

- La app se instala como PWA y abre sin internet después de la primera visita.
- Firestore guarda en caché local los datos ya vistos y sincroniza los cambios al volver la conexión.
- Para el primer inicio de sesión hace falta conexión.
