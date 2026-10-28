import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileDown, Minus, Plus, Printer, Search, ShoppingCart, Trash2, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, qs } from '../../lib/api'
import { money } from '../../lib/format'
import { descargarPdf } from '../../lib/pdf'
import { Badge, Button, Empty, Input, Modal, PageHeader, Select, Skeleton } from '../../components/ui'
import { ProductThumb } from '../../components/extras'

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
const NC = { tipo_doc: 'DNI', numero_doc: '', nombre: '', direccion: '', telefono: '' }

export default function POS() {
  const [pct, setPct] = useState(18)
  const [empresa, setEmpresa] = useState(null)
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [prods, setProds] = useState(null)
  const [cart, setCart] = useState([])
  const [cliente, setCliente] = useState(null)
  const [cq, setCq] = useState('')
  const [res, setRes] = useState([])
  const [comp, setComp] = useState('BOLETA')
  const [pagar, setPagar] = useState(true)
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [recibido, setRecibido] = useState('')
  const [obs, setObs] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [nc, setNc] = useState(null)

  useEffect(() => {
    api.get('/empresa').then((e) => setPct(Number(e.igv_porcentaje))).catch(() => {})
    api.get('/tienda/empresa').then(setEmpresa).catch(() => {})
  }, [])
  useEffect(() => { const t = setTimeout(() => setQd(q), 300); return () => clearTimeout(t) }, [q])

  const loadProds = () => api.get('/productos' + qs({ q: qd, limit: 24 })).then(setProds).catch((e) => { toast.error(e.message); setProds([]) })
  useEffect(() => { loadProds() }, [qd]) // eslint-disable-line

  useEffect(() => {
    if (cq.trim().length < 2) { setRes([]); return }
    const t = setTimeout(() => api.get('/clientes' + qs({ q: cq, limit: 6 })).then(setRes).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [cq])

  const add = (p) => setCart((c) => {
    const i = c.find((x) => x.p.id === p.id)
    if (i) return c.map((x) => (x.p.id === p.id ? { ...x, cantidad: Math.min(x.cantidad + 1, p.stock) } : x))
    return [...c, { p, cantidad: 1, descuento: 0 }]
  })
  const upd = (id, patch) => setCart((c) => c.map((x) => (x.p.id === id ? { ...x, ...patch } : x)))
  const del = (id) => setCart((c) => c.filter((x) => x.p.id !== id))

  const subtotal = r2(cart.reduce((s, i) => s + Math.max(0, r2(i.p.precio_venta * i.cantidad - i.descuento)), 0))
  const igv = r2((subtotal * pct) / 100)
  const total = r2(subtotal * (1 + pct / 100))
  const rec = recibido === '' ? total : Number(recibido)
  const vuelto = Math.max(0, r2(rec - total))
  const facturaMal = comp === 'FACTURA' && cliente?.tipo_doc !== 'RUC'
  const count = cart.reduce((s, i) => s + i.cantidad, 0)

  const cobrar = async () => {
    setBusy(true)
    try {
      const venta = await api.post('/ventas', {
        comprobante: comp, cliente_id: cliente?.id ?? null, observaciones: obs || null,
        items: cart.map((i) => ({ producto_id: i.p.id, cantidad: i.cantidad, descuento: Number(i.descuento) || 0 })),
        pagos: pagar ? [{ metodo, monto: Math.min(rec, total) }] : [],
      })
      setDone(venta); setCart([]); setCliente(null); setCq(''); setRecibido(''); setObs(''); loadProds()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const guardarCliente = async (e) => {
    e.preventDefault()
    try {
      const c = await api.post('/clientes', {
        tipo_doc: nc.tipo_doc, numero_doc: nc.numero_doc.trim(), nombre: nc.nombre.trim(),
        direccion: nc.direccion || null, telefono: nc.telefono || null,
      })
      setCliente(c); setNc(null); toast.success('Cliente creado')
    } catch (err) { toast.error(err.message) }
  }
  const autocompletar = async () => {
    try {
      const r = await api.get(`/consultas/${nc.tipo_doc === 'RUC' ? 'ruc' : 'dni'}/${nc.numero_doc}`)
      setNc((s) => ({ ...s, nombre: r.nombre || s.nombre, direccion: r.direccion || s.direccion }))
    } catch (err) { toast.error(err.message) }
  }

  return (
    <>
      <PageHeader title="Nueva venta" subtitle="Busca productos, arma la venta y cobra" />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto por nombre, SKU o N° de parte..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm outline-none focus:border-cyan-400/60" />
          </div>
          {!prods ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : prods.length === 0 ? <Empty text="No se encontraron productos" /> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {prods.map((p, i) => (
                <motion.button key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  whileTap={{ scale: 0.97 }} disabled={p.stock <= 0} onClick={() => add(p)}
                  className="glass flex items-center gap-3 rounded-2xl p-3 text-left transition hover:border-cyan-400/50 disabled:opacity-40">
                  <ProductThumb p={p} className="size-14 shrink-0 rounded-xl [&_svg]:size-6" />
                  <span className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-tight">{p.nombre}</p>
                    <span className="mt-1 flex items-center justify-between">
                      <b className="text-cyan-300">{money(r2(p.precio_venta * (1 + pct / 100)))}</b>
                      <Badge tone={p.stock <= 0 ? 'rose' : p.stock <= p.stock_minimo ? 'amber' : 'emerald'}>{p.stock}</Badge>
                    </span>
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <aside id="carrito" className="glass h-fit space-y-4 rounded-3xl p-5 lg:sticky lg:top-6 lg:col-span-2">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold"><ShoppingCart className="size-5" />Venta actual <Badge tone="violet">{count}</Badge></h2>

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {cart.length === 0 && <Empty icon={ShoppingCart} text="Agrega productos desde la izquierda" />}
            <AnimatePresence initial={false}>
              {cart.map((i) => (
                <motion.div key={i.p.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="rounded-xl bg-white/5 p-3">
                  <div className="flex justify-between gap-2"><p className="line-clamp-2 text-sm font-medium">{i.p.nombre}</p><button onClick={() => del(i.p.id)} className="text-rose-300"><Trash2 className="size-4" /></button></div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <div className="flex items-center rounded-lg bg-white/5">
                      <button className="p-1.5" onClick={() => upd(i.p.id, { cantidad: Math.max(1, i.cantidad - 1) })}><Minus className="size-3.5" /></button>
                      <span className="w-8 text-center">{i.cantidad}</span>
                      <button className="p-1.5" onClick={() => upd(i.p.id, { cantidad: Math.min(i.p.stock, i.cantidad + 1) })}><Plus className="size-3.5" /></button>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-white/50">Desc. S/
                      <input type="number" min="0" step="0.01" value={i.descuento || ''} onChange={(e) => upd(i.p.id, { descuento: Number(e.target.value) })}
                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none" />
                    </label>
                    <b className="ml-auto">{money(r2((i.p.precio_venta * i.cantidad - i.descuento) * (1 + pct / 100)))}</b>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-white/60">Cliente</p>
            {cliente ? (
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                <span><b>{cliente.nombre}</b><br /><span className="text-xs text-white/50">{cliente.tipo_doc} {cliente.numero_doc}</span></span>
                <button onClick={() => setCliente(null)}><X className="size-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-2">
                  <input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Buscar por nombre o documento (opcional)"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-400/60" />
                  <Button variant="ghost" onClick={() => setNc({ ...NC })}><UserPlus className="size-4" /></Button>
                </div>
                {res.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#14163a] shadow-xl">
                    {res.map((c) => <li key={c.id}><button onClick={() => { setCliente(c); setCq(''); setRes([]) }} className="w-full px-3 py-2 text-left text-sm hover:bg-white/10">{c.nombre} <span className="text-xs text-white/40">{c.tipo_doc} {c.numero_doc}</span></button></li>)}
                  </ul>
                )}
                <p className="mt-1 text-[11px] text-white/40">Sin cliente se emite a "Cliente varios".</p>
              </div>
            )}
          </div>

          <Select label="Comprobante" value={comp} onChange={(e) => setComp(e.target.value)}>
            <option value="BOLETA">Boleta</option><option value="FACTURA">Factura (requiere cliente con RUC)</option><option value="NOTA_VENTA">Nota de venta</option>
          </Select>
          {facturaMal && <p className="rounded-lg bg-amber-500/15 p-2 text-xs text-amber-200">Para factura, elige o crea un cliente con RUC.</p>}

          <div className="space-y-1 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between text-white/60"><span>Op. gravada</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between text-white/60"><span>IGV ({pct}%)</span><span>{money(igv)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-gradient font-display">{money(total)}</span></div>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pagar} onChange={(e) => setPagar(e.target.checked)} /> Registrar pago ahora</label>
          {pagar && (
            <div className="grid grid-cols-2 gap-3">
              <Select label="Método" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA'].map((m) => <option key={m} value={m}>{m[0] + m.slice(1).toLowerCase()}</option>)}
              </Select>
              <Input label="Monto recibido" type="number" min="0" step="0.01" placeholder={String(total)} value={recibido} onChange={(e) => setRecibido(e.target.value)} />
              {vuelto > 0 && <p className="col-span-2 text-sm text-emerald-300">Vuelto: <b>{money(vuelto)}</b></p>}
              {rec < total && <p className="col-span-2 text-xs text-amber-200">Pago parcial: la venta quedará pendiente por {money(r2(total - rec))}.</p>}
            </div>
          )}
          <Input label="Observaciones (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} />
          <Button className="w-full py-3 text-base" loading={busy} disabled={cart.length === 0 || facturaMal || (pagar && rec <= 0)} onClick={cobrar}>
            Cobrar {money(total)}
          </Button>
        </aside>
      </div>

      <a href="#carrito" className="btn-glow fixed inset-x-4 bottom-24 z-30 flex items-center justify-between rounded-2xl px-5 py-3 font-semibold shadow-2xl lg:hidden">
        <span className="flex items-center gap-2"><ShoppingCart className="size-5" />{count} productos</span><span>{money(total)}</span>
      </a>

      <Modal open={!!done} onClose={() => setDone(null)} title="Venta registrada">
        {done && (
          <div className="space-y-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}><CheckCircle2 className="mx-auto size-16 text-emerald-400" /></motion.div>
            <p className="font-display text-xl font-bold">{done.serie}-{String(done.numero).padStart(6, '0')}</p>
            <p className="text-3xl font-bold text-gradient font-display">{money(done.total)}</p>
            <Badge tone={done.estado === 'PAGADA' ? 'emerald' : 'amber'}>{done.estado}</Badge>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => descargarPdf(done, empresa, 'a4')}><FileDown className="size-4" />PDF A4</Button>
              <Button variant="ghost" onClick={() => descargarPdf(done, empresa, 'ticket')}><Printer className="size-4" />Ticket 80 mm</Button>
            </div>
            <Button variant="success" className="w-full" onClick={() => setDone(null)}>Nueva venta</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!nc} onClose={() => setNc(null)} title="Nuevo cliente">
        {nc && (
          <form onSubmit={guardarCliente} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Documento" value={nc.tipo_doc} onChange={(e) => setNc({ ...nc, tipo_doc: e.target.value })}>
                <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option>
              </Select>
              <Input label="Número *" required value={nc.numero_doc} onChange={(e) => setNc({ ...nc, numero_doc: e.target.value })} />
            </div>
            {['DNI', 'RUC'].includes(nc.tipo_doc) && <Button type="button" variant="ghost" onClick={autocompletar}>Autocompletar con el documento</Button>}
            <Input label="Nombre o razón social *" required value={nc.nombre} onChange={(e) => setNc({ ...nc, nombre: e.target.value })} />
            <Input label="Dirección" value={nc.direccion} onChange={(e) => setNc({ ...nc, direccion: e.target.value })} />
            <Input label="Teléfono" value={nc.telefono} onChange={(e) => setNc({ ...nc, telefono: e.target.value })} />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setNc(null)}>Cancelar</Button><Button type="submit">Guardar cliente</Button></div>
          </form>
        )}
      </Modal>
    </>
  )
}