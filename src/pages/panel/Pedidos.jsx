import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Ban, Check, CheckCircle2, MapPin, MessageCircle, Phone, Receipt, RefreshCw, RotateCcw, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, qs } from '../../lib/api'
import { fmtDateTime, money } from '../../lib/format'
import { descargarExcel } from '../../lib/excel'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Empty, Modal, PageHeader, Select, Skeleton, Textarea } from '../../components/ui'
import { ExportButton } from '../../components/extras'

const TABS = [['TODOS', 'Todos'], ['NUEVO', 'Nuevos'], ['CONFIRMADO', 'Confirmados'], ['CONVERTIDO', 'Convertidos'], ['CANCELADO', 'Cancelados']]
const TONE = { NUEVO: 'cyan', CONFIRMADO: 'violet', CONVERTIDO: 'emerald', CANCELADO: 'rose' }
const MOTIVOS = ['Cliente no responde', 'Cliente desistió de la compra', 'Devolución del cliente', 'Producto sin stock', 'Pedido duplicado', 'Datos incorrectos', 'Otro motivo']
const wa = (t = '') => {
  const d = t.replace(/\D/g, '')
  return `https://wa.me/${d.length === 9 ? '51' + d : d}`
}
const quien = (p) => (p.atendido ? `${p.atendido.nombres} ${p.atendido.apellidos}`.trim() : '')

export default function Pedidos() {
  const { can } = useAuth()
  const admin = can('admin')
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('NUEVO')
  const [q, setQ] = useState('')
  const [conv, setConv] = useState(null)
  const [f, setF] = useState({ comprobante: 'BOLETA', metodo: '' })
  const [cancel, setCancel] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback((silent = false) => {
    if (!silent) setRows(null)
    api.get('/pedidos' + qs({ limit: 200 })).then(setRows).catch((e) => { toast.error(e.message); setRows((r) => r || []) })
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(() => load(true), 60000)
    return () => clearInterval(t)
  }, [load])

  const counts = useMemo(() => {
    const c = { TODOS: rows?.length || 0 }
    ;(rows || []).forEach((p) => { c[p.estado] = (c[p.estado] || 0) + 1 })
    return c
  }, [rows])

  const visibles = (rows || []).filter((p) =>
    (tab === 'TODOS' || p.estado === tab) &&
    (!q || `${p.id} ${p.nombre} ${p.telefono}`.toLowerCase().includes(q.toLowerCase())),
  )

  const cambiar = async (id, estado, motivo) => {
    setBusy(true)
    try {
      await api.patch(`/pedidos/${id}/estado`, { estado, motivo: motivo || null })
      toast.success({ CONFIRMADO: 'Pedido confirmado', CANCELADO: 'Compra cancelada y registrada', NUEVO: 'Pedido reabierto' }[estado])
      setCancel(null)
      if (estado === 'CANCELADO') setTab('CANCELADO') // para verlo registrado ahí mismo
      if (estado === 'NUEVO') setTab('NUEVO')
      load(true)
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const convertir = async () => {
    setBusy(true)
    try {
      const r = await api.post(`/pedidos/${conv.id}/convertir`, { comprobante: f.comprobante, metodo_pago: f.metodo || null })
      toast.success(`Venta #${r.venta_id} creada`)
      setConv(null); load(true)
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const convertido = cancel?.p.estado === 'CONVERTIDO'

  return (
    <>
      <PageHeader title="Pedidos web" subtitle="Pedidos enviados por los clientes desde la tienda">
        <div className="flex gap-2">
          <button onClick={() => load()} className="glass rounded-lg p-2 text-white/70 hover:text-white" title="Actualizar"><RefreshCw className="size-4" /></button>
          <ExportButton onClick={() => rows && descargarExcel('pedidos_web', [
            { label: 'N°', value: 'id' }, { label: 'Fecha', value: (p) => fmtDateTime(p.created_at) }, { label: 'Cliente', value: 'nombre' },
            { label: 'Teléfono', value: 'telefono' }, { label: 'Documento', value: (p) => (p.numero_doc ? `${p.tipo_doc} ${p.numero_doc}` : '-') },
            { label: 'Entrega', value: 'entrega' }, { label: 'Estado', value: 'estado' }, { label: 'Total', value: 'total' },
            { label: 'Motivo de cancelación', value: (p) => p.motivo_cancelacion || '' }, { label: 'Atendido por', value: quien },
          ], visibles, { titulo: 'Registro de pedidos web', subtitulo: `Filtro: ${tab}`, totales: ['Total'], excluir: { label: 'Estado', valor: 'CANCELADO' } })} />
        </div>
      </PageHeader>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${tab === k ? 'btn-glow text-white' : 'glass text-white/70 hover:text-white'}`}>
            {label}<span className={`rounded-full px-1.5 text-[11px] ${tab === k ? 'bg-white/25' : 'bg-white/10'}`}>{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por N°, nombre o teléfono..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-400/60" />
      </div>

      {!rows ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-60" />)}</div>
      ) : visibles.length === 0 ? (
        <Empty text="No hay pedidos en esta sección" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibles.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}
              className={`glass rounded-2xl p-5 ${p.estado === 'CANCELADO' ? 'opacity-90' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold">#{p.id} · {p.nombre}</p>
                  <p className="text-xs text-white/40">{fmtDateTime(p.created_at)}</p>
                </div>
                <Badge tone={TONE[p.estado]}>{p.estado}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <a href={`tel:${p.telefono}`} className="glass inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1"><Phone className="size-3.5" />{p.telefono}</a>
                <a href={wa(p.telefono)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-emerald-200"><MessageCircle className="size-3.5" />WhatsApp</a>
                <Badge>{p.entrega === 'ENVIO' ? 'Envío' : 'Recojo'}</Badge>
                {p.numero_doc && <Badge tone="violet">{p.tipo_doc} {p.numero_doc}</Badge>}
              </div>
              {p.direccion && <p className="mt-2 flex gap-1.5 text-sm text-white/60"><MapPin className="size-4 shrink-0" />{p.direccion}</p>}
              {p.notas && <p className="mt-2 rounded-lg bg-white/5 p-2.5 text-sm text-white/70">“{p.notas}”</p>}

              <ul className="mt-3 divide-y divide-white/5 text-sm">
                {p.pedido_items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate">{it.cantidad} × {it.productos?.nombre}</span>
                    <span className="text-white/60">{money(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                <span className="text-white/50">Total (con IGV)</span>
                <span className="font-display text-gradient text-xl font-bold">{money(p.total)}</span>
              </div>

              {p.estado === 'CANCELADO' && (
                <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                  <p className="flex items-center gap-1.5 font-semibold"><Ban className="size-4" />Compra cancelada y registrada</p>
                  <p className="mt-0.5 text-rose-100/80">Motivo: {p.motivo_cancelacion || 'sin motivo registrado'}</p>
                  {p.venta_id && <p className="mt-0.5 text-rose-100/80">La venta #{p.venta_id} fue anulada y el stock volvió al inventario.</p>}
                  <p className="mt-1 text-[11px] text-rose-100/50">{quien(p) ? `Por ${quien(p)}` : ''}{p.atendido_en ? ` · ${fmtDateTime(p.atendido_en)}` : ''}</p>
                </div>
              )}
              {p.estado === 'CONFIRMADO' && (
                <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-100">
                  <p className="flex items-center gap-1.5 font-semibold"><Check className="size-4" />Confirmado</p>
                  <p className="text-[11px] text-violet-100/60">{quien(p) ? `Por ${quien(p)}` : ''}{p.atendido_en ? ` · ${fmtDateTime(p.atendido_en)}` : ''}</p>
                </div>
              )}
              {p.estado === 'CONVERTIDO' && (
                <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="size-4" />Convertido en la venta #{p.venta_id}</p>
                  <p className="text-[11px] text-emerald-100/60">{quien(p) ? `Por ${quien(p)}` : ''}{p.atendido_en ? ` · ${fmtDateTime(p.atendido_en)}` : ''}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {p.estado === 'NUEVO' && <Button variant="ghost" loading={busy} onClick={() => cambiar(p.id, 'CONFIRMADO')}><Check className="size-4" />Confirmar</Button>}
                {['NUEVO', 'CONFIRMADO'].includes(p.estado) && (
                  <>
                    <Button onClick={() => { setConv(p); setF({ comprobante: p.tipo_doc === 'RUC' ? 'FACTURA' : 'BOLETA', metodo: '' }) }}><Receipt className="size-4" />Convertir en venta</Button>
                    <Button variant="danger" onClick={() => setCancel({ p, motivo: MOTIVOS[0], detalle: '' })}><Ban className="size-4" />Cancelar pedido</Button>
                  </>
                )}
                {p.estado === 'CONVERTIDO' && (admin
                  ? <Button variant="danger" onClick={() => setCancel({ p, motivo: MOTIVOS[2], detalle: '' })}><Ban className="size-4" />Cancelar compra</Button>
                  : <p className="text-xs text-white/40">Solo un administrador puede cancelar un pedido ya convertido en venta.</p>)}
                {p.estado === 'CANCELADO' && <Button variant="ghost" loading={busy} onClick={() => cambiar(p.id, 'NUEVO')}><RotateCcw className="size-4" />Reabrir pedido</Button>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!conv} onClose={() => setConv(null)} title={`Convertir pedido #${conv?.id} en venta`}>
        <div className="space-y-4">
          <p className="text-sm text-white/60">Se descontará el stock y se calculará el IGV con los precios actuales.</p>
          <Select label="Comprobante" value={f.comprobante} onChange={(e) => setF({ ...f, comprobante: e.target.value })}>
            <option value="BOLETA">Boleta</option><option value="FACTURA">Factura (requiere cliente con RUC)</option><option value="NOTA_VENTA">Nota de venta</option>
          </Select>
          <Select label="Registrar pago completo" value={f.metodo} onChange={(e) => setF({ ...f, metodo: e.target.value })}>
            <option value="">Todavía no (queda pendiente)</option>
            {['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((m) => <option key={m} value={m}>{m[0] + m.slice(1).toLowerCase()}</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConv(null)}>Volver</Button>
            <Button loading={busy} onClick={convertir}>Crear venta</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!cancel} onClose={() => setCancel(null)} title={`${convertido ? 'Cancelar compra' : 'Cancelar pedido'} #${cancel?.p.id}`}>
        {cancel && (
          <div className="space-y-4">
            {convertido ? (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Este pedido ya es la venta <b>#{cancel.p.venta_id}</b>. Al cancelarlo, <b>esa venta se anula</b> y el stock vuelve al inventario.
                Si ya cobraste, la devolución del dinero se hace aparte.
              </div>
            ) : (
              <p className="text-sm text-white/60">La cancelación queda registrada con el motivo, tu nombre y la fecha. Podrás reabrir el pedido si fue un error.</p>
            )}
            <Select label="Motivo *" value={cancel.motivo} onChange={(e) => setCancel({ ...cancel, motivo: e.target.value })}>
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Textarea label="Detalle (opcional)" rows={2} value={cancel.detalle} onChange={(e) => setCancel({ ...cancel, detalle: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCancel(null)}>Volver</Button>
              <Button variant="danger" loading={busy} onClick={() => cambiar(cancel.p.id, 'CANCELADO', `${cancel.motivo}${cancel.detalle.trim() ? ' — ' + cancel.detalle.trim() : ''}`)}>
                <Ban className="size-4" />Confirmar cancelación
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}