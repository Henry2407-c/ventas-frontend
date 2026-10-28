import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND } from '../brand'

const TIPO = { BOLETA: 'BOLETA DE VENTA', FACTURA: 'FACTURA', NOTA_VENTA: 'NOTA DE VENTA' }
const m = (n) => 'S/ ' + Number(n || 0).toFixed(2)
const fecha = (d) => new Date(d).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' })

function preparar(v) {
  const sub = Number(v.subtotal)
  const pct = sub > 0 ? Math.round((Number(v.igv) / sub) * 100) : 18
  const items = (v.venta_items || []).map((i) => {
    const importe = Number(i.subtotal) * (1 + pct / 100)
    return { cant: i.cantidad, desc: i.productos?.nombre || '', unit: importe / i.cantidad, importe }
  })
  const pagado = (v.pagos || []).reduce((s, p) => s + Number(p.monto), 0)
  return { pct, items, pagado, num: `${v.serie}-${String(v.numero).padStart(6, '0')}`, cli: v.clientes }
}

/** formato: 'a4' | 'ticket' (80 mm) */
export function descargarPdf(v, e, formato = 'a4') {
  const d = preparar(v)
  const doc = formato === 'ticket' ? ticket(v, e, d) : a4(v, e, d)
  doc.save(`${TIPO[v.comprobante].replace(/ /g, '_')}_${d.num}.pdf`)
}

function a4(v, e, d) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(124, 58, 237); doc.rect(0, 0, W, 5, 'F')
  doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(e?.nombre_comercial || 'Mi empresa', 14, 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90)
  ;[e?.razon_social, [e?.direccion, e?.distrito].filter(Boolean).join(', '), [e?.telefono, e?.email].filter(Boolean).join('  |  ')]
    .filter(Boolean).forEach((t, i) => doc.text(t, 14, 25 + i * 5, { maxWidth: 110 }))

  doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.7); doc.roundedRect(W - 78, 11, 64, 29, 2, 2)
  doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text(`RUC ${e?.ruc || ''}`, W - 46, 19, { align: 'center' })
  doc.text(TIPO[v.comprobante], W - 46, 26, { align: 'center' })
  doc.setTextColor(124, 58, 237); doc.text(d.num, W - 46, 34, { align: 'center' })

  doc.setTextColor(40); doc.setFontSize(9)
  ;[
    ['Cliente', d.cli?.nombre || 'CLIENTE VARIOS'],
    [d.cli?.tipo_doc || 'Documento', d.cli?.numero_doc || '-'],
    ['Dirección', d.cli?.direccion || '-'],
    ['Fecha de emisión', fecha(v.fecha)],
  ].forEach(([k, val], i) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, 14, 52 + i * 6)
    doc.setFont('helvetica', 'normal'); doc.text(String(val), 44, 52 + i * 6, { maxWidth: W - 60 })
  })

  autoTable(doc, {
    startY: 80,
    head: [['Cant.', 'Descripción', 'P. Unit.', 'Importe']],
    body: d.items.map((i) => [i.cant, i.desc, m(i.unit), m(i.importe)]),
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { halign: 'center', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 32 } },
  })

  let y = (doc.lastAutoTable?.finalY ?? 100) + 8
  if (y > 235) { doc.addPage(); y = 20 }
  const fila = (k, val, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 11 : 9); doc.setTextColor(30)
    doc.text(k, W - 70, y); doc.text(val, W - 14, y, { align: 'right' }); y += bold ? 7 : 5.5
  }
  fila('Op. gravada', m(v.subtotal)); fila(`IGV (${d.pct}%)`, m(v.igv)); fila('TOTAL', m(v.total), true)

  y += 3
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30); doc.text('Pagos', 14, y); y += 5
  doc.setFont('helvetica', 'normal')
  if (!(v.pagos || []).length) { doc.text('Sin pagos registrados', 14, y); y += 5 }
  ;(v.pagos || []).forEach((p) => { doc.text(`${p.metodo}${p.referencia ? ' - ' + p.referencia : ''}`, 14, y); doc.text(m(p.monto), 90, y, { align: 'right' }); y += 5 })
  const saldo = Number(v.total) - d.pagado
  if (saldo > 0.01 && v.estado !== 'ANULADA') { doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 120, 0); doc.text(`Saldo pendiente: ${m(saldo)}`, 14, y + 2) }

  if (v.estado === 'ANULADA') {
    doc.setTextColor(220, 38, 38); doc.setFont('helvetica', 'bold'); doc.setFontSize(40)
    doc.text('ANULADA', W / 2, 150, { align: 'center', angle: 25 })
  }
  doc.setTextColor(120); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text(BRAND.pdfFooter, W / 2, 287, { align: 'center' })
  return doc
}

function ticket(v, e, d) {
  const alto = 100 + d.items.length * 12 + (v.pagos?.length || 0) * 4 + d.items.reduce((s, i) => s + Math.ceil(i.desc.length / 34) * 3.5, 0)
  const doc = new jsPDF({ unit: 'mm', format: [80, alto] })
  let y = 7
  const centro = (t, size = 8, bold = false) => {
    doc.setFont('courier', bold ? 'bold' : 'normal'); doc.setFontSize(size)
    const l = doc.splitTextToSize(String(t), 72); doc.text(l, 40, y, { align: 'center' }); y += l.length * (size * 0.42 + 0.8)
  }
  const par = (a, b, bold = false) => { doc.setFont('courier', bold ? 'bold' : 'normal'); doc.setFontSize(8); doc.text(a, 4, y); doc.text(b, 76, y, { align: 'right' }); y += 4 }
  const raya = () => { doc.setDrawColor(150); doc.setLineDashPattern([0.8, 0.8], 0); doc.line(4, y, 76, y); doc.setLineDashPattern([], 0); y += 3.5 }

  centro(e?.nombre_comercial || 'Mi empresa', 11, true)
  if (e?.razon_social) centro(e.razon_social)
  if (e?.ruc) centro(`RUC ${e.ruc}`)
  if (e?.direccion) centro(e.direccion)
  if (e?.telefono) centro(`Tel. ${e.telefono}`)
  y += 1; raya()
  centro(TIPO[v.comprobante], 9, true); centro(d.num, 9, true); centro(fecha(v.fecha))
  raya()
  doc.setFont('courier', 'normal'); doc.setFontSize(8)
  doc.text(`Cliente: ${d.cli?.nombre || 'CLIENTE VARIOS'}`.slice(0, 40), 4, y); y += 4
  if (d.cli?.numero_doc) { doc.text(`${d.cli.tipo_doc}: ${d.cli.numero_doc}`, 4, y); y += 4 }
  raya()
  d.items.forEach((i) => {
    const l = doc.splitTextToSize(i.desc, 72); doc.text(l, 4, y); y += l.length * 3.5
    par(`${i.cant} x ${m(i.unit)}`, m(i.importe))
  })
  raya()
  par('Op. gravada', m(v.subtotal)); par(`IGV (${d.pct}%)`, m(v.igv)); par('TOTAL', m(v.total), true)
  ;(v.pagos || []).forEach((p) => par(String(p.metodo), m(p.monto)))
  if (v.estado === 'ANULADA') { y += 2; centro('*** ANULADA ***', 10, true) }
  y += 2; raya(); centro(BRAND.pdfFooter, 7)
  return doc
}