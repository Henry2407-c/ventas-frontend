import { api } from './api'

let _emp
async function empresa() {
  if (!_emp) _emp = await api.get('/tienda/empresa').then((e) => e.nombre_comercial).catch(() => 'Reporte')
  return _emp
}

// Formato automático según el nombre de la columna (se puede forzar con fmt: 'money' | 'int' | 'text')
const MONEY = /total|subtotal|igv|costo|precio|ingreso|utilidad|monto|saldo|meta|vendido|pagado|importe|gravada/i
const INT = /cant|unidad|stock|m[ií]nimo|^ventas$|^n[°º]/i
const FMT = { money: '"S/" #,##0.00', int: '#,##0' }
const fmtDe = (c) => c.fmt || (INT.test(c.label) ? 'int' : MONEY.test(c.label) ? 'money' : 'text')
const bonito = (s) => { const t = s.replace(/_/g, ' '); return t[0].toUpperCase() + t.slice(1) }
const letra = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const thin = { style: 'thin', color: { argb: 'FFE5E7EB' } }
const BORDE = { top: thin, left: thin, bottom: thin, right: thin }

function agregarHoja(wb, emp, h) {
  const { columnas, filas } = h
  const n = columnas.length
  const fm = columnas.map(fmtDe)
  const ws = wb.addWorksheet((h.hoja || h.titulo).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const celdas = filas.map((f) =>
    columnas.map((c, i) => {
      const v = typeof c.value === 'function' ? c.value(f) : f[c.value]
      return fm[i] === 'text' ? (v ?? '') : Number(v) || 0
    }),
  )

  columnas.forEach((c, i) => {
    const largos = celdas.map((r) => String(fm[i] === 'money' ? r[i].toFixed(2) : r[i]).length)
    ws.getColumn(i + 1).width = c.width || Math.min(48, Math.max(String(c.label).length, 8, ...largos) + 4)
  })

  // Título y subtítulo
  if (n > 1) { ws.mergeCells(1, 1, 1, n); ws.mergeCells(2, 1, 2, n) }
  const t = ws.getCell(1, 1)
  t.value = h.titulo
  t.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
  t.fill = fill('FF4C1D95')
  t.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 34
  const s = ws.getCell(2, 1)
  s.value = `${emp}${h.subtitulo ? '  ·  ' + h.subtitulo : ''}  ·  Generado el ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' })}`
  s.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } }
  s.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(2).height = 20

  // Encabezados
  const hr = ws.getRow(4)
  hr.height = 24
  columnas.forEach((c, i) => {
    const cell = hr.getCell(i + 1)
    cell.value = c.label
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = fill('FF7C3AED')
    cell.alignment = { vertical: 'middle', horizontal: fm[i] === 'text' ? 'left' : 'right' }
    cell.border = BORDE
  })

  // Filas
  celdas.forEach((vals, r) => {
    const row = ws.getRow(5 + r)
    vals.forEach((v, i) => {
      const cell = row.getCell(i + 1)
      cell.value = v
      if (fm[i] !== 'text') cell.numFmt = FMT[fm[i]]
      cell.alignment = { vertical: 'middle', horizontal: fm[i] === 'text' ? 'left' : 'right' }
      cell.border = BORDE
      if (r % 2) cell.fill = fill('FFF5F3FF')
    })
  })
  const ultimo = 4 + celdas.length

  if (celdas.length === 0) {
    if (n > 1) ws.mergeCells(5, 1, 5, n)
    const c = ws.getCell(5, 1)
    c.value = 'Sin datos para mostrar'
    c.font = { italic: true, color: { argb: 'FF9CA3AF' } }
    c.alignment = { horizontal: 'center' }
    return
  }

  // Totales con fórmulas (opcionalmente excluyendo filas, por ejemplo las anuladas)
  if (h.totales?.length) {
    const ex = h.excluir ? columnas.findIndex((c) => c.label === h.excluir.label) : -1
    const tr = ws.getRow(ultimo + 1)
    tr.height = 24
    columnas.forEach((c, i) => {
      const cell = tr.getCell(i + 1)
      cell.fill = fill('FFEDE9FE')
      cell.font = { bold: true, color: { argb: 'FF4C1D95' } }
      cell.border = { top: { style: 'medium', color: { argb: 'FF7C3AED' } }, bottom: thin, left: thin, right: thin }
      if (i === 0) cell.value = 'TOTAL'
      if (!h.totales.includes(c.label)) return
      const rango = `${letra(i + 1)}5:${letra(i + 1)}${ultimo}`
      let formula, result
      if (ex >= 0) {
        formula = `SUMIF(${letra(ex + 1)}5:${letra(ex + 1)}${ultimo},"<>${h.excluir.valor}",${rango})`
        result = celdas.reduce((a, r) => (r[ex] === h.excluir.valor ? a : a + r[i]), 0)
      } else {
        formula = `SUM(${rango})`
        result = celdas.reduce((a, r) => a + r[i], 0)
      }
      cell.value = { formula, result }
      cell.numFmt = FMT[fm[i]] || '#,##0.00'
      cell.alignment = { horizontal: 'right' }
    })
  }

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: ultimo, column: n } }
}

/** hojas: [{ hoja, titulo, subtitulo, columnas, filas, totales, excluir }] */
export async function descargarLibro(nombre, hojas) {
  const [m, emp] = await Promise.all([import('exceljs'), empresa()])
  const ExcelJS = m.default || m
  const wb = new ExcelJS.Workbook()
  wb.creator = emp
  wb.created = new Date()
  hojas.forEach((h) => agregarHoja(wb, emp, h))
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

/** Misma firma que usaba el CSV: (nombre, columnas, filas, opciones) */
export const descargarExcel = (nombre, columnas, filas, opts = {}) =>
  descargarLibro(nombre, [{
    titulo: opts.titulo || bonito(nombre), hoja: opts.hoja, subtitulo: opts.subtitulo,
    columnas, filas, totales: opts.totales, excluir: opts.excluir,
  }])