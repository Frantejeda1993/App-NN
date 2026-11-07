import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import { clearIndexedDbPersistence, doc, getDoc, terminate } from 'firebase/firestore'
import { getFirebase } from '@/lib/firebase'
import { isActiveMember, memberKey } from './membership'
import type { AuthService, MemberDoc } from './types'

export function createFirebaseAuthService(): AuthService {
  const { auth, db } = getFirebase()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  return {
    onUserChanged(cb) {
      return onAuthStateChanged(auth, (u) =>
        cb(u ? { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL } : null),
      )
    },
    async signIn() {
      await signInWithPopup(auth, provider)
    },
    async signOut(options) {
      await fbSignOut(auth)
      if (options?.clearLocalData) {
        // Borra los datos de Firestore guardados en este dispositivo. La instancia
        // queda inutilizable después de terminate(), así que se recarga la app.
        try {
          await terminate(db)
          await clearIndexedDbPersistence(db)
        } finally {
          window.location.reload()
        }
      }
    },
    async isMember(email) {
      // Sin conexión, getDoc responde desde la caché local si ya se leyó antes.
      const snap = await getDoc(doc(db, 'members', memberKey(email)))
      return isActiveMember(snap.exists() ? (snap.data() as MemberDoc) : undefined)
    },
  }
}
