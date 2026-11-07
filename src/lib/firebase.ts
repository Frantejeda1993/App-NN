import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

// La config web de Firebase no es secreta (la seguridad la dan las reglas),
// pero se mantiene fuera del repo para poder cambiar de proyecto sin tocar código.
const env = import.meta.env
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const missingFirebaseEnv: string[] = Object.entries({
  VITE_FIREBASE_API_KEY: config.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: config.authDomain,
  VITE_FIREBASE_PROJECT_ID: config.projectId,
  VITE_FIREBASE_APP_ID: config.appId,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)

// Nunca en producción: el build de Pages no define esta variable.
export const useEmulators = import.meta.env.DEV && env.VITE_USE_EMULATORS === 'true'

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!app || !auth || !db) {
    app = initializeApp(config)
    auth = getAuth(app)
    // Solo en desarrollo local (`npm run dev:emulators`): nada sale a Firebase real.
    if (useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    // Caché persistente en IndexedDB: la app funciona sin conexión con los
    // datos ya vistos y sincroniza al volver la red (varias pestañas a la vez).
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // Los campos opcionales sin valor se omiten en lugar de fallar.
      ignoreUndefinedProperties: true,
    })
    if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
  return { app, auth, db }
}
