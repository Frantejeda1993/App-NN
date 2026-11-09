/**
 * Dibuja el PDF del presupuesto con jsPDF. Se carga recién al pulsar el botón
 * (import dinámico) para no sumar peso a la app.
 */
import logoUrl from '@/assets/logo.png'
import type { QuotePdfModel } from '@/domain/quotePdf'

const WALNUT: [number, number, number] = [122, 74, 45]
const INK: [number, number, number] = [38, 38, 38]
const MUTED: [number, number, number] = [120, 113, 108]

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function downloadQuotePdf(model: QuotePdfModel, fileName: string): Promise<void> {
  const [{ jsPDF }, { autoTable }, logo] = await Promise.all([import('jspdf'), import('jspdf-autotable'), toDataUrl(logoUrl)])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 15

  // ---- encabezado: logo + datos del taller | fecha, versión, validez ----
  let x = M
  if (logo) {
    doc.addImage(logo, 'PNG', M, M, 26, 26)
    x = M + 31
  }
  doc.setTextColor(...INK)
  model.workshopLines.forEach((line, i) => {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal')
    doc.setFontSize(i === 0 ? 14 : 9)
    doc.text(line, x, M + 6 + (i === 0 ? 0 : 2 + i * 4.5))
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  model.meta.forEach((line, i) => doc.text(line, W - M, M + 6 + i * 4.5, { align: 'right' }))

  let y = M + 36
  doc.setDrawColor(...WALNUT)
  doc.setLineWidth(0.6)
  doc.line(M, y, W - M, y)

  // ---- título y cliente ----
  y += 9
  doc.setTextColor(...WALNUT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(doc.splitTextToSize(model.title, W - 2 * M), M, y)
  if (model.clientLines.length > 0) {
    y += 8
    doc.setTextColor(...MUTED)
    doc.setFontSize(8)
    doc.text('CLIENTE', M, y)
    doc.setTextColor(...INK)
    model.clientLines.forEach((line, i) => {
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal')
      doc.setFontSize(10)
      doc.text(line, M, y + 5 + i * 4.8)
    })
    y += 5 + model.clientLines.length * 4.8
  }

  // ---- tabla de muebles y líneas ----
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head: [['Descripción', 'Medidas (mm)', 'Cant.', 'Importe']],
    body: model.rows.map((r) => [
      [r.description, r.detail, r.excluded ? '(no aceptado)' : ''].filter(Boolean).join('\n'),
      r.measures,
      r.qty,
      r.amount,
    ]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 } },
    headStyles: { fillColor: WALNUT, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 243, 238] },
    columnStyles: {
      1: { cellWidth: 34, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && model.rows[data.row.index]?.excluded) data.cell.styles.textColor = MUTED
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // ---- totales ----
  const ensure = (needed: number) => {
    if (y + needed > H - M - 8) {
      doc.addPage()
      y = M + 4
    }
  }
  ensure(model.totals.length * 6 + 4)
  for (const t of model.totals) {
    doc.setFont('helvetica', t.strong ? 'bold' : 'normal')
    doc.setFontSize(t.strong ? 11 : 9.5)
    doc.setTextColor(...(t.strong ? INK : MUTED))
    doc.text(t.label, W - M - 34, y, { align: 'right' })
    doc.text(t.amount, W - M - 2, y, { align: 'right' })
    y += t.strong ? 6.5 : 5.5
  }

  // ---- condiciones y observaciones ----
  const block = (label: string, text: string) => {
    if (!text) return
    const body = doc.splitTextToSize(text, W - 2 * M) as string[]
    ensure(10 + body.length * 4.4)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...WALNUT)
    doc.text(label, M, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(body, M, y + 5)
    y += 5 + body.length * 4.4
  }
  block('CONDICIONES DE PAGO Y PLAZO', model.terms)
  block('OBSERVACIONES', model.notes)

  // ---- pie, numeración y marca de borrador en cada página ----
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(model.workshopLines[0] ?? '', M, H - 8)
    doc.text(`Página ${p} de ${pages}`, W - M, H - 8, { align: 'right' })
    if (model.draft) {
      doc.saveGraphicsState()
      // En tiempo de ejecución GState es un constructor (los tipos lo declaran como método).
      const GState = doc.GState as unknown as new (p: { opacity: number }) => unknown
      doc.setGState(new GState({ opacity: 0.12 }))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(80)
      doc.setTextColor(...WALNUT)
      doc.text('BORRADOR', W / 2, H / 2, { align: 'center', angle: 35 })
      doc.restoreGraphicsState()
    }
  }

  doc.save(fileName)
}
