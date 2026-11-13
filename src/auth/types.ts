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
  /**
   * Vigila en vivo el propio registro de socio: `active` false si lo
   * desactivan o lo borran mientras la sesión está abierta.
   */
  watchMembership(email: string, cb: (active: boolean) => void): () => void
}

export type AuthStatus = 'loading' | 'signedOut' | 'notMember' | 'member' | 'error'

export interface MemberDoc {
  name?: string
  active?: boolean
  /** `admin`: entra a la app pero no es socio. Sin valor = socio. */
  role?: 'socio' | 'admin'
}
