# Seguridad de Taller NN

App estática en GitHub Pages + Firebase (plan Spark, sin backend). **La única barrera real son las
reglas de Firestore** ([`firestore.rules`](firestore.rules)); la app valida con zod para dar buenos
mensajes, pero nunca se confía solo en eso.

## Modelo

- **Quién entra:** cuenta de Google con email verificado **y** documento `members/{email}` con
  `active: true`. La lista de socios solo se cambia desde la consola de Firebase; desde la app es
  imposible (ni agregarse a uno mismo).
- **Administrador:** `members/{email}` con `role: 'admin'` entra con el mismo acceso que un socio
  (de confianza, queda registrado quién y cuándo), pero no es socio: la app lo deja fuera de
  repartos, saldos y selectores, y las reglas rechazan asignarle `paidBy`/`memberEmail`. No puede
  cambiar su rol (nadie escribe en `members` desde la app).
- **Los socios son de confianza:** todos pueden hacer todo, pero queda registrado quién y cuándo
  (lo fija el servidor, no se puede firmar como otro).
- **Dinero:** los movimientos son estrictos (campos exactos, tipos, importes positivos), versionados
  y con un historial (`auditLog`) que debe coincidir con el cambio y no se puede editar ni borrar.
  Las reglas también exigen los datos según el tipo: un campo que no corresponde (p. ej. un reparto
  entre proyectos en un cobro) se rechaza, las partes de un reparto (hasta 10, por el tope de evaluación de las reglas) suman el total, la
  fecha es AAAA-MM-DD válida y solo se asigna a socios activos. No hay borrado físico: las bajas son
  lógicas y **el motivo es obligatorio**.
- **Ediciones simultáneas:** presupuestos y proyectos llevan un contador `rev` que las reglas exigen
  subir en 1: si otro socio guardó antes, el segundo guardado se rechaza en lugar de pisarlo. Un
  presupuesto y su proyecto se guardan en el mismo lote (todo o nada).

## Protecciones

| Riesgo | Protección | Prueba |
|---|---|---|
| Alguien fuera de la lista, socio desactivado, email sin verificar o sin sesión | Las reglas niegan leer, listar y crear en **todas** las colecciones | `tests/rules` (matriz por colección) |
| Socio desactivado con la sesión abierta | La app vigila su registro en vivo: cierra sesión y borra los datos del dispositivo | `AuthProvider.test.tsx`, e2e `access.spec.ts` |
| Preferencias de otro usuario (`userPrefs`, p. ej. el tour visto) | Cada socio lee y escribe solo las suyas, con campos fijos | `tests/rules` (preferencias de usuario) |
| Dispositivo compartido | "Cerrar sesión" borra la caché offline de Firestore | `AuthProvider` |
| Login falso de desarrollo en producción | Solo existe con `import.meta.env.DEV` y emuladores | `src/lib/firebase.ts` |
| Enlaces maliciosos en el catálogo (`javascript:`, `data:`) | Solo se guardan `http(s)` y al mostrar se vuelve a filtrar (`safeHref`) | `schemas.test.ts` |
| La app dentro de un marco de otra web (engaño de clics) | Si detecta un marco, no arranca (Pages no permite la cabecera) | `frameGuard.test.ts` |
| Scripts inyectados (XSS) | Content-Security-Policy como `<meta>` en el build: solo scripts propios y los del login de Google | `vite.config.ts` (`cspPlugin`) |
| Historial de contactos | No se borra (como los clientes) | `tests/rules` (otros endurecimientos) |
| Acciones del CI comprometidas | Fijadas por SHA de commit; Dependabot las actualiza | `.github/workflows/deploy.yml`, `.github/dependabot.yml` |
| Parámetros de la URL | Solo se usan ids que existen e importes acotados | `MovementNewPage` |
| Dependencias | `npm audit --omit=dev` sin vulnerabilidades (`@grpc/grpc-js` forzado a una versión corregida) | CI |
| Secretos | `.env*` y el Excel nunca se suben; la config web de Firebase es pública por diseño | `.gitignore` |

## Riesgos aceptados

- Fuera de los movimientos, las reglas validan los campos principales y no cada detalle (los socios
  son de confianza). Que un reparto sume 100 % o que los importes de una compra compartida cuadren lo
  controla la app: las reglas no pueden sumar un mapa.
- Cualquier cuenta de Google puede abrir el login. No ve nada, pero podría generar peticiones
  rechazadas y gastar la cuota gratuita diaria. Mitigación propuesta: **App Check** (abajo).
- Un socio desactivado cuyo dispositivo sigue **sin conexión** puede ver la copia local (IndexedDB)
  hasta que se reconecte; en ese momento se cierra la sesión y se borra. No accede a nada nuevo del
  servidor.
- La configuración inicial de la billetera (`settings/opening`) solo valida la forma en las reglas;
  que los importes cuadren con las cajas lo muestra la app.

## Checklist de la consola (revisar una vez y tras cambios)

1. **Authentication → Método de acceso:** solo **Google** habilitado (sin email/contraseña ni anónimo).
2. **Authentication → Configuración → Dominios autorizados:** `frantejeda1993.github.io`, `localhost`
   y los dominios de Firebase que vienen por defecto. Nada más.
3. **Google Cloud → APIs y servicios → Credenciales → clave de API del navegador:** restricción por
   sitios web (`https://frantejeda1993.github.io/*`, `http://localhost:*`,
   `https://app-nn-a74ad.firebaseapp.com/*`). Probar el login después de cambiarlo.
4. **Firestore → Reglas:** publicadas las de este repo (`npx firebase deploy --only firestore:rules`).
   El CI prueba las reglas pero **no las publica**: después de cada cambio en `firestore.rules`
   hay que publicarlas a mano **antes** de que llegue la app nueva (la app nueva escribe campos que
   las reglas viejas no conocen, como `rev` o el movimiento `reparto`).
5. **Socios:** dar de baja = `active: false` en `members/{email}` (la sesión abierta se cierra sola).

## Pendiente opcional: App Check

Con App Check + reCAPTCHA v3 (gratis) solo esta app puede hablar con Firestore, lo que corta el abuso
de cuota. Requiere registrar el sitio en la consola (clave de reCAPTCHA) y activar la verificación
después de comprobar que el login sigue funcionando.

## Pruebas

`npm test` (unitarias), `npm run test:rules` (reglas), `npm run test:e2e` (punta a punta). Las tres
corren en el CI antes de cada deploy.
