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
| `npm run dev` | Servidor de desarrollo (usa tu Firebase real vía `.env.local`) |
| `npm run dev:emulators` | Desarrollo **sin tocar datos reales**: levanta los emuladores de Auth y Firestore con datos de prueba en `http://localhost:5174`. Al tocar "Entrar con Google" pide un email de prueba (`dev@taller.test` ya es socio). Requiere Java 21+ |
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

## Seguridad y datos

La app no tiene backend propio: **`firestore.rules` es la única barrera real**. La app valida todo con zod (`src/model`), pero las reglas son las que deciden qué se puede leer y escribir.

- **Socios:** solo un socio activo (`members/{email}` con `active: true`) puede leer o escribir. Los ids de `members` tienen que estar **en minúsculas**: un id con mayúsculas nunca da acceso.
- **Auditoría:** cada documento lleva `createdBy/createdAt/updatedBy/updatedAt`, y los pone el servidor. Nadie puede firmar como otro socio ni inventar la fecha.
- **Movimientos de dinero:**
  - No se borran: se marcan como eliminados.
  - Cada alta, edición o baja sube la versión y escribe `auditLog/{id}_v{n}` con el estado anterior y el nuevo. Las reglas verifican que el registro coincida exactamente con el movimiento.
  - Si dos socios editan el mismo movimiento a la vez, el segundo recibe un error de conflicto.
- **Presupuestos:** solo se borran los que están en borrador. Uno enviado no puede volver a borrador.
- **Dinero:** se guarda en céntimos enteros. Los porcentajes se guardan en puntos básicos (10000 = 100 %).

Riesgos aceptados (equipo chico de socios de confianza):

- Cualquier socio puede editar cualquier dato; el registro de auditoría muestra quién lo hizo.
- Las reglas no validan que los repartos sumen 100 %, las transiciones de estado de proyectos ni que los ids referenciados existan. Eso lo controla la app.
- Al desactivar un socio, sus escrituras se rechazan enseguida. Las pantallas que ya tenía abiertas pueden seguir mostrando datos un rato.
- Quien edita directamente desde la consola de Firebase se saltea todas las reglas.

## Sin conexión

- La app se instala como PWA y abre sin internet después de la primera visita.
- Firestore guarda en caché local los datos ya vistos y sincroniza los cambios al volver la conexión.
- Para el primer inicio de sesión hace falta conexión.
