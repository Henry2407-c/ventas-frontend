import { useCallback, useEffect, useState } from 'react'
import { Ban, FileDown, Printer, RotateCcw, Search, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, qs } from '../../lib/api'
import { fmtDateTime, limaDate, money, monthStart } from '../../lib/format'
import { descargarPdf } from '../../lib/pdf'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Empty, Input, Modal, PageHeader, Select, Skeleton } from '../../components/ui'
import { descargarExcel } from '../../lib/excel'
import { ExportButton } from '../../components/extras'


const ESTADO = { PAGADA: 'emerald', PENDIENTE: 'amber', ANULADA: 'rose' }
const num = (v) => `${v.serie}-${String(v.numero).padStart(6, '0')}`

function Detalle({ id, empresa, onClose, onChanged }) {
  const { can } = useAuth()
  const op = can('admin', 'vendedor')
  const admin = can('admin')
  const [v, setV] = useState(null)
  const [devs, setDevs] = useState([])
  const [pago, setPago] = useState({ metodo: 'EFECTIVO', monto: '', referencia: '' })
  const [dev, setDev] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [venta, d] = await Promise.all([api.get(`/ventas/${id}`), api.get(`/ventas/${id}/devoluciones`).catch(() => [])])
    setV(venta); setDevs(d)
  }, [id])
  useEffect(() => { setV(null); setDev(null); load().catch((e) => { toast.error(e.message); onClose() }) }, [load]) // eslint-disable-line

  const run = async (fn, msg) => {
    setBusy(true)
    try { await fn(); toast.success(msg); await load(); onChanged() } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  if (!v) return <Skeleton className="h-64" />
  const pagado = (v.pagos || []).reduce((s, p) => s + Number(p.monto), 0)
  const saldo = Math.max(0, Number(v.total) - pagado)
  const devuelto = {}
  devs.forEach((d) => d.devolucion_items.forEach((x) => { devuelto[x.venta_item_id] = (devuelto[x.venta_item_id] || 0) + x.cantidad }))
  const anulada = v.estado === 'ANULADA'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-display text-xl font-bold">{num(v)}</p><p className="text-xs text-white/40">{fmtDateTime(v.fecha)} · {v.comprobante}</p></div>
        <Badge tone={ESTADO[v.estado]}>{v.estado}</Badge>
      </div>
      <p className="text-sm text-white/70">Cliente: <b>{v.clientes?.nombre || 'Cliente varios'}</b> {v.clientes && <span className="text-white/40">({v.clientes.tipo_doc} {v.clientes.numero_doc})</span>}</p>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-white/40"><tr><th className="p-2.5">Producto</th><th className="p-2.5 text-center">Cant.</th><th className="p-2.5 text-center">Devuelto</th><th className="p-2.5 text-right">Subtotal</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {v.venta_items.map((i) => (
              <tr key={i.id}><td className="p-2.5">{i.productos?.nombre}</td><td className="p-2.5 text-center">{i.cantidad}</td><td className="p-2.5 text-center text-white/50">{devuelto[i.id] || 0}</td><td className="p-2.5 text-right">{money(i.subtotal)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-white/60"><span>Op. gravada</span><span>{money(v.subtotal)}</span></div>
        <div className="flex justify-between text-white/60"><span>IGV</span><span>{money(v.igv)}</span></div>
        <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(v.total)}</span></div>
        <div className="flex justify-between text-emerald-300"><span>Pagado</span><span>{money(pagado)}</span></div>
        {saldo > 0.01 && !anulada && <div className="flex justify-between text-amber-300"><span>Saldo</span><b>{money(saldo)}</b></div>}
      </div>

      {(v.pagos || []).length > 0 && (
        <ul className="space-y-1 text-sm">{v.pagos.map((p) => <li key={p.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5"><span>{p.metodo} {p.referencia && <span className="text-white/40">· {p.referencia}</span>}</span><span>{money(p.monto)}</span></li>)}</ul>
      )}
      {devs.length > 0 && (
        <div className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-100">
          <p className="mb-1 font-semibold">Devoluciones</p>
          {devs.map((d) => <p key={d.id}>#{d.id} · {d.motivo} · {money(d.total)} <span className="text-white/40">({fmtDateTime(d.fecha)})</span></p>)}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <Button onClick={() => descargarPdf(v, empresa, 'a4')}><FileDown className="size-4" />PDF A4</Button>
        <Button variant="ghost" onClick={() => descargarPdf(v, empresa, 'ticket')}><Printer className="size-4" />Ticket</Button>
        {op && !anulada && <Button variant="ghost" onClick={() => setDev(dev ? null : { motivo: '', qty: {} })}><RotateCcw className="size-4" />Devolución</Button>}
        {admin && !anulada && (
          <Button variant="danger" loading={busy} onClick={() => window.confirm('¿Anular esta venta? El stock no devuelto volverá al inventario.') && run(() => api.post(`/ventas/${id}/anular`), 'Venta anulada')}>
            <Ban className="size-4" />Anular
          </Button>
        )}
      </div>

      {op && !anulada && saldo > 0.01 && (
        <div className="glass space-y-3 rounded-2xl p-4">
          <p className="flex items-center gap-2 font-semibold"><Wallet className="size-4" />Registrar pago</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>{['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((m) => <option key={m} value={m}>{m[0] + m.slice(1).toLowerCase()}</option>)}</Select>
            <Input type="number" step="0.01" min="0" placeholder={saldo.toFixed(2)} value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} />
            <Input placeholder="Referencia (opcional)" value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} />
          </div>
          <Button loading={busy} onClick={() => run(() => api.post(`/ventas/${id}/pagos`, { metodo: pago.metodo, monto: Number(pago.monto || saldo), referencia: pago.referencia || null }).then(() => setPago({ metodo: 'EFECTIVO', monto: '', referencia: '' })), 'Pago registrado')}>Registrar</Button>
        </div>
      )}

      {dev && (
        <div className="glass space-y-3 rounded-2xl p-4">
          <p className="font-semibold">Devolución parcial</p>
          {v.venta_items.map((i) => {
            const max = i.cantidad - (devuelto[i.id] || 0)
            return (
              <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{i.productos?.nombre} <span className="text-white/40">(disp. {max})</span></span>
                <input type="number" min="0" max={max} disabled={max === 0} value={dev.qty[i.id] ?? ''} placeholder="0"
                  onChange={(e) => setDev({ ...dev, qty: { ...dev.qty, [i.id]: Math.min(max, Math.max(0, Number(e.target.value))) } })}
                  className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center outline-none disabled:opacity-30" />
              </div>
            )
          })}
          <Input label="Motivo *" value={dev.motivo} onChange={(e) => setDev({ ...dev, motivo: e.target.value })} />
          <Button loading={busy} disabled={dev.motivo.trim().length < 3 || !Object.values(dev.qty).some((q) => q > 0)}
            onClick={() => run(() => api.post(`/ventas/${id}/devoluciones`, {
              motivo: dev.motivo,
              items: Object.entries(dev.qty).filter(([, q]) => q > 0).map(([venta_item_id, cantidad]) => ({ venta_item_id: Number(venta_item_id), cantidad })),
            }).then(() => setDev(null)), 'Devolución registrada')}>
            Registrar devolución
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Ventas() {
  const { user } = useAuth()
  const propia = user.rol === 'vendedor'
  const [desde, setDesde] = useState(monthStart())
  const [hasta, setHasta] = useState(limaDate())
  const [estado, setEstado] = useState('')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)
  const [sel, setSel] = useState(null)
  const [empresa, setEmpresa] = useState(null)

  useEffect(() => { api.get('/tienda/empresa').then(setEmpresa).catch(() => {}) }, [])
  const load = useCallback(() => {
    setRows(null)
    api.get('/ventas' + qs({ desde, hasta, estado, limit: 200 })).then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  }, [desde, hasta, estado])
  useEffect(() => { load() }, [load])

  const quien = (v) => (v.vendedor ? `${v.vendedor.nombres} ${v.vendedor.apellidos}`.trim() : '')
  const pagado = (v) => (v.pagos || []).reduce((s, p) => s + Number(p.monto), 0)
  const filtradas = (rows || []).filter((v) => !q || `${num(v)} ${v.clientes?.nombre || ''} ${quien(v)}`.toLowerCase().includes(q.toLowerCase()))
  const validas = filtradas.filter((v) => v.estado !== 'ANULADA')
  const total = validas.reduce((s, v) => s + Number(v.total), 0)
  const porCobrar = validas.reduce((s, v) => s + Math.max(0, Number(v.total) - pagado(v)), 0)

  const exportar = () => descargarExcel('ventas', [
    { label: 'Comprobante', value: num }, { label: 'Tipo', value: 'comprobante' },
    { label: 'Cliente', value: (v) => v.clientes?.nombre || 'Cliente varios' },
    { label: 'Documento', value: (v) => v.clientes?.numero_doc || '-' },
    { label: 'Vendedor', value: quien },
    { label: 'Fecha', value: (v) => fmtDateTime(v.fecha) }, { label: 'Estado', value: 'estado' },
    { label: 'Subtotal', value: 'subtotal' }, { label: 'IGV', value: 'igv' }, { label: 'Total', value: 'total' },
    { label: 'Pagado', value: pagado },
    { label: 'Saldo', value: (v) => (v.estado === 'ANULADA' ? 0 : Math.max(0, Number(v.total) - pagado(v))) },
  ], filtradas, {
    titulo: 'Reporte de ventas',
    subtitulo: `Del ${desde} al ${hasta}${estado ? ' · ' + estado : ''}${propia ? ' · ' + (user.nombre || '') : ''}`,
    totales: ['Subtotal', 'IGV', 'Total', 'Pagado', 'Saldo'],
    excluir: { label: 'Estado', valor: 'ANULADA' },
  })

  return (
    <>
      <PageHeader title="Ventas" subtitle={propia ? 'Mostrando solo tus ventas' : 'Todas las ventas del negocio'}>
        <ExportButton onClick={exportar} />
      </PageHeader>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[['Ventas', filtradas.length], ['Total vendido', money(total)], ['Por cobrar', money(porCobrar)]].map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-3.5 sm:p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/45">{k}</p>
            <p className="font-display mt-0.5 text-lg font-bold sm:text-2xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por comprobante, cliente o vendedor..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-400/60" />
        </div>
        <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <Select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos</option><option value="PAGADA">Pagadas</option><option value="PENDIENTE">Pendientes</option><option value="ANULADA">Anuladas</option>
        </Select>
      </div>

      {!rows ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : filtradas.length === 0 ? (
          <Empty text={propia ? 'No hay ventas tuyas en este periodo. Aquí solo aparecen las que registraste tú.' : 'No hay ventas en este filtro'} />
        ) : (
          <>
            <div className="space-y-2.5 sm:hidden">
              {filtradas.map((v) => (
                <button key={v.id} onClick={() => setSel(v.id)} className="glass w-full rounded-2xl p-4 text-left transition active:scale-[.98]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold">{num(v)}</p>
                      <p className="truncate text-sm text-white/60">{v.clientes?.nombre || 'Cliente varios'}</p>
                    </div>
                    <div className="text-right"><p className="font-bold">{money(v.total)}</p><Badge tone={ESTADO[v.estado]}>{v.estado}</Badge></div>
                  </div>
                  <p className="mt-2 text-[11px] text-white/40">{fmtDateTime(v.fecha)}{!propia && quien(v) ? ` · ${quien(v)}` : ''}</p>
                </button>
              ))}
            </div>

            <div className="glass hidden overflow-x-auto rounded-2xl sm:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-xs uppercase text-white/40">
                  <tr><th className="p-3">Comprobante</th><th className="p-3">Cliente</th>{!propia && <th className="p-3">Vendedor</th>}<th className="p-3">Fecha</th><th className="p-3">Estado</th><th className="p-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtradas.map((v) => (
                    <tr key={v.id} onClick={() => setSel(v.id)} className="cursor-pointer hover:bg-white/5">
                      <td className="p-3 font-medium">{num(v)}<span className="ml-2 text-[11px] text-white/40">{v.comprobante}</span></td>
                      <td className="p-3 text-white/70">{v.clientes?.nombre || 'Cliente varios'}</td>
                      {!propia && <td className="p-3 text-white/60">{quien(v) || '-'}</td>}
                      <td className="p-3 text-white/50">{fmtDateTime(v.fecha)}</td>
                      <td className="p-3"><Badge tone={ESTADO[v.estado]}>{v.estado}</Badge></td>
                      <td className="p-3 text-right font-semibold">{money(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      <Modal open={!!sel} onClose={() => setSel(null)} title="Detalle de la venta" wide>
        {sel && <Detalle id={sel} empresa={empresa} onClose={() => setSel(null)} onChanged={load} />}
      </Modal>
    </>
  )
}