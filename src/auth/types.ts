export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

/**
 * Lo que la app necesita de la autenticación. Firebase lo implementa en
 * `firebaseAuthService.ts`; los tests usan un fake.
 */
export interface AuthService {
  onUserChanged(cb: (user: AuthUser | null) => void): () => void
  signIn(): Promise<void>
  /** `clearLocalData`: borra la caché offline de Firestore del dispositivo. */
  signOut(options?: { clearLocalData?: boolean }): Promise<void>
  isMember(email: string): Promise<boolean>
}

export type AuthStatus = 'loading' | 'signedOut' | 'notMember' | 'member' | 'error'

export interface MemberDoc {
  name?: string
  active?: boolean
}
