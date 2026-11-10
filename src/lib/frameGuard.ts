/**
 * GitHub Pages no permite enviar cabeceras (X-Frame-Options / CSP frame-ancestors),
 * así que la app se protege sola: si está dentro de un marco de otra página
 * (posible engaño de clics), no arranca.
 */
export function isFramed(win: { readonly self: unknown; readonly top: unknown } = window): boolean {
  try {
    return win.top !== win.self
  } catch {
    // Acceder a `top` de otro origen puede lanzar: entonces sí está enmarcada.
    return true
  }
}
