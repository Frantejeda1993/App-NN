import type { MemberDoc } from './types'

/** Id del documento en `members/`: el email en minúsculas. */
export function memberKey(email: string): string {
  return email.trim().toLowerCase()
}

/** Solo da acceso un documento existente con `active: true`. */
export function isActiveMember(doc: MemberDoc | undefined): boolean {
  return doc?.active === true
}
