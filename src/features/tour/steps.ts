/**
 * Recorrido guiado por la app. Cada paso dice cómo se usa y por qué funciona así.
 * Si los pasos cambian mucho, subir TOUR_VERSION: el tour se vuelve a mostrar
 * una vez a todos.
 */
export const TOUR_VERSION = 1

export interface TourStep {
  id: string
  /** Pantalla donde se muestra (ruta del HashRouter, con query si hace falta). */
  route: string
  /** Selector CSS del elemento a resaltar; sin él, el globo va centrado. */
  target?: string
  title: string
  body: string[]
}

const NAV = 'nav[aria-label="Principal"], nav[aria-label="Principal móvil"]'

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'bienvenida',
    route: '/',
    title: 'Bienvenido a Taller NN',
    body: [
      'Acá está todo el taller en un solo lugar: clientes, proyectos, presupuestos, el catálogo de precios y la plata.',
      'Todo está conectado: un presupuesto aceptado pasa a ser ingreso esperado, un cobro entra a la billetera y cada cambio queda registrado con quién lo hizo.',
      'Te muestro cada parte en un par de minutos. Podés salir cuando quieras y repetirlo desde Ajustes.',
    ],
  },
  {
    id: 'menu',
    route: '/',
    target: NAV,
    title: 'El menú',
    body: [
      'Desde acá vas a cada sección. En el celular está abajo.',
      'Todos los socios pueden hacer todo; por eso cada cambio guarda quién lo hizo y cuándo, y nadie puede firmar como otro.',
    ],
  },
  {
    id: 'inicio',
    route: '/',
    target: 'main h1',
    title: 'Inicio: lo que necesita atención hoy',
    body: [
      'Muestra los clientes a los que toca contactar (o que llevan muchos días sin noticias) y los gastos fijos del mes que faltan pagar.',
      'Por qué: para que no se enfríe ningún cliente ni se pase un pago, sin tener que revisar todo a mano.',
    ],
  },
  {
    id: 'clientes',
    route: '/clientes',
    target: 'a[href="#/clientes/nuevo"]',
    title: 'Clientes y seguimiento',
    body: [
      'Cargá cada cliente con su teléfono (el botón de WhatsApp abre el chat directo) y registrá cada contacto: qué se habló y cuándo volver a escribirle.',
      'Por qué: con la próxima fecha de contacto y los días sin noticias se arman las alertas del inicio. Si un cliente ya no hace falta seguirlo, apagás su seguimiento.',
    ],
  },
  {
    id: 'proyectos',
    route: '/proyectos',
    target: 'a[href="#/proyectos/nuevo"]',
    title: 'Proyectos',
    body: [
      'Cada trabajo es un proyecto de un cliente: resumen, fechas (pedido, presupuesto, entrega prometida), gastos estimados y notas.',
      'Al crearlo definís el reparto: qué parte de la ganancia le toca a cada socio y al taller (suma 100 %; puede haber 0 %). Por qué: la billetera usa ese reparto para calcular cuánto le corresponde a cada uno.',
    ],
  },
  {
    id: 'proyectos-estados',
    route: '/proyectos',
    target: '[role="tablist"][aria-label="Estado"]',
    title: 'Estados del proyecto',
    body: [
      'Pendiente, en proceso, entregado, finalizado, cobrado, cancelado o archivado. Filtrá por estado para ver qué hay en marcha.',
      'Por qué: los cancelados y archivados dejan de contar como ingreso esperado, y una entrega comprometida que se pasó se marca en rojo.',
    ],
  },
  {
    id: 'presupuestos',
    route: '/presupuestos',
    target: '[data-tour="nuevo-presupuesto"]',
    title: 'Presupuestos',
    body: [
      'Podés crear uno desde acá, pero conviene hacerlo desde el proyecto: queda vinculado al cliente y al reparto.',
      'Agregás muebles desde una plantilla o en blanco (medidas, materiales, puertas, cajones, herrajes) y el precio se calcula solo: materiales, corte y canteado, cantos, herrajes y mano de obra sugerida, que podés cambiar a mano.',
    ],
  },
  {
    id: 'presupuestos-por-que',
    route: '/presupuestos',
    title: 'Cómo se calcula y qué pasa después',
    body: [
      'Placas enteras: se suman los m² (con desperdicio) de todos los muebles de cada material y se redondea a placas, porque el proveedor vende placas completas. El costo se reparte entre los muebles según lo que usa cada uno.',
      'Una vez enviado, el presupuesto no se edita: se crea una nueva versión, así siempre queda claro qué se le mandó al cliente. El cliente puede aceptarlo entero o en parte.',
      'Aceptado, cuenta como plata por cobrar en la billetera, habilita la lista de compras por proveedor y podés descargar el PDF para el cliente, con la vista 3D de los muebles.',
    ],
  },
  {
    id: 'billetera',
    route: '/billetera',
    target: '[role="tablist"][aria-label="Billetera"]',
    title: 'Billetera',
    body: [
      'El resumen muestra el dinero en cajas, los gastos pendientes, lo que el taller les debe a los socios y el disponible real; lo que falta cobrar de presupuestos aceptados y lo enviado sin respuesta; y cuánto le corresponde a cada socio.',
      'En las otras pestañas están los movimientos, las cajas (efectivo, banco…) y los gastos generales, fijos o esporádicos, cada uno con su propio reparto.',
    ],
  },
  {
    id: 'billetera-movimiento',
    route: '/billetera',
    target: 'a[href="#/billetera/nuevo"]',
    title: 'Registrar un movimiento',
    body: [
      'Cobros, gastos de un proyecto o generales, aportes y retiros de socios, y transferencias entre cajas. Si un socio pagó algo de su bolsillo, queda como deuda del taller con él hasta que se la devuelvan.',
      'Por qué así: cada movimiento guarda sus versiones. Editar o eliminar (siempre con motivo) deja historial y nada se borra de verdad, así las cuentas siempre se pueden revisar.',
    ],
  },
  {
    id: 'catalogo',
    route: '/catalogo',
    target: '[role="tablist"][aria-label="Catálogo"]',
    title: 'Catálogo de precios',
    body: [
      'Materiales con su precio por placa y desperdicio, cantos por metro, herrajes y extras, las tarifas de corte y mano de obra, y las plantillas de los muebles que más hacen.',
      'Por qué: los presupuestos se calculan con estos precios; si sube un material, lo cambiás acá una sola vez. No se borra nada, se desactiva, porque los presupuestos viejos lo siguen usando.',
    ],
  },
  {
    id: 'ajustes',
    route: '/ajustes',
    target: '[data-tour="ajustes-taller"]',
    title: 'Ajustes',
    body: [
      'Datos del taller que salen en el PDF (NIF, dirección, teléfono, email), condiciones de pago, validez de los presupuestos, días para las alertas de contacto y el reparto con el que arranca cada proyecto.',
      'Desde acá también podés repetir este recorrido cuando quieras.',
    ],
  },
  {
    id: 'fin',
    route: '/ajustes',
    title: '¡Listo!',
    body: [
      'Para empezar: completá los datos del taller acá, cargá el catálogo (hay un botón con los valores del Excel), creá un cliente con su proyecto y armá el presupuesto desde el proyecto.',
      'Si te queda alguna duda, repetí el tour desde Ajustes → «Repetir el tour».',
    ],
  },
]
