import { useCallback, useEffect, useState } from 'react'
import { Ban, Pencil, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, qs } from '../../lib/api'
import { daysAgo, limaDate, money } from '../../lib/format'
import { descargarExcel } from '../../lib/excel'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Empty, Input, Modal, PageHeader, Select, Skeleton } from '../../components/ui'
import { ExportButton } from '../../components/extras'

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

function NuevaCompra({ provs, pct, onClose, onDone }) {
  const [f, setF] = useState({ proveedor_id: '', documento: '', fecha: limaDate(), observaciones: '' })
  const [q, setQ] = useState('')
  const [res, setRes] = useState([])
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return }
    const t = setTimeout(() => api.get('/productos' + qs({ q, limit: 6 })).then(setRes).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [q])

  const add = (p) => {
    setItems((it) => (it.find((x) => x.p.id === p.id) ? it : [...it, { p, cantidad: 1, costo: p.precio_compra ? String(p.precio_compra) : '' }]))
    setQ(''); setRes([])
  }
  const upd = (id, patch) => setItems((it) => it.map((x) => (x.p.id === id ? { ...x, ...patch } : x)))
  const subtotal = r2(items.reduce((s, i) => s + Number(i.cantidad || 0) * Number(i.costo || 0), 0))
  const igv = r2((subtotal * pct) / 100)
  const valid = items.length > 0 && items.every((i) => Number(i.cantidad) > 0 && i.costo !== '' && Number(i.costo) >= 0)

  const save = async () => {
    setBusy(true)
    try {
      await api.post('/compras', {
        proveedor_id: f.proveedor_id ? Number(f.proveedor_id) : null,
        documento: f.documento.trim() || null, fecha: f.fecha, observaciones: f.observaciones.trim() || null,
        items: items.map((i) => ({ producto_id: i.p.id, cantidad: Number(i.cantidad), costo_unitario: Number(i.costo) })),
      })
      toast.success('Compra registrada: el stock ya se actualizó'); onDone()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Proveedor" value={f.proveedor_id} onChange={(e) => setF({ ...f, proveedor_id: e.target.value })}>
          <option value="">Sin proveedor</option>{provs.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
        </Select>
        <Input label="N° de documento" placeholder="F001-123" value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} />
        <Input label="Fecha" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
      </div>

      <div className="relative">
        <Input label="Agregar producto" placeholder="Busca por nombre o SKU..." value={q} onChange={(e) => setQ(e.target.value)} />
        {res.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#14163a] shadow-xl">
            {res.map((p) => <li key={p.id}><button type="button" onClick={() => add(p)} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-white/10"><span>{p.nombre}</span><span className="text-xs text-white/40">{p.sku} · stock {p.stock}</span></button></li>)}
          </ul>
        )}
      </div>

      {items.length === 0 ? <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-white/40">Busca y agrega los productos que compraste</p> : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.p.id} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl bg-white/5 p-3 sm:grid-cols-[1fr_90px_120px_auto]">
              <p className="col-span-2 text-sm font-medium sm:col-span-1">{i.p.nombre}</p>
              <Input label="Cantidad" type="number" min="1" value={i.cantidad} onChange={(e) => upd(i.p.id, { cantidad: e.target.value })} />
              <Input label="Costo unit. (sin IGV)" type="number" min="0" step="0.01" value={i.costo} onChange={(e) => upd(i.p.id, { costo: e.target.value })} />
              <button type="button" onClick={() => setItems((it) => it.filter((x) => x.p.id !== i.p.id))} className="mb-2 text-rose-300"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between text-white/60"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="flex justify-between text-white/60"><span>IGV ({pct}%)</span><span>{money(igv)}</span></div>
        <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(subtotal + igv)}</span></div>
      </div>
      <Input label="Observaciones" value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button loading={busy} disabled={!valid} onClick={save}>Registrar compra</Button>
      </div>
    </div>
  )
}

function ListaCompras() {
  const { can } = useAuth()
  const edit = can('admin', 'almacenero')
  const admin = can('admin')
  const [desde, setDesde] = useState(daysAgo(30))
  const [hasta, setHasta] = useState(limaDate())
  const [prov, setProv] = useState('')
  const [provs, setProvs] = useState([])
  const [pct, setPct] = useState(18)
  const [rows, setRows] = useState(null)
  const [nueva, setNueva] = useState(false)
  const [sel, setSel] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/proveedores').then(setProvs).catch(() => {})
    api.get('/empresa').then((e) => setPct(Number(e.igv_porcentaje))).catch(() => {})
  }, [])
  const load = useCallback(() => {
    setRows(null)
    api.get('/compras' + qs({ desde, hasta, proveedor_id: prov, limit: 200 })).then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  }, [desde, hasta, prov])
  useEffect(() => { load() }, [load])

  const abrir = async (id) => {
    setSel({ loading: true })
    try { setSel(await api.get(`/compras/${id}`)) } catch (e) { toast.error(e.message); setSel(null) }
  }
  const anular = async () => {
    if (!window.confirm('¿Anular esta compra? Se descontará del inventario el stock que ingresó.')) return
    setBusy(true)
    try { await api.post(`/compras/${sel.id}/anular`); toast.success('Compra anulada'); setSel(null); load() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const total = (rows || []).filter((c) => c.estado !== 'ANULADA').reduce((s, c) => s + Number(c.total), 0)

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <Select label="Proveedor" value={prov} onChange={(e) => setProv(e.target.value)}>
          <option value="">Todos</option>{provs.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
        </Select>
        <p className="pb-2.5 text-sm text-white/50">{rows?.length ?? '...'} compras · {money(total)}</p>
        <div className="ml-auto flex gap-2 pb-0.5">
          <ExportButton onClick={() => rows && descargarExcel('compras', [
            { label: 'N°', value: 'id' }, { label: 'Fecha', value: 'fecha' }, { label: 'Proveedor', value: (c) => c.proveedores?.razon_social || '' },
            { label: 'Documento', value: 'documento' }, { label: 'Estado', value: 'estado' }, { label: 'Subtotal', value: 'subtotal' },
            { label: 'IGV', value: 'igv' }, { label: 'Total', value: 'total' },
          ], rows)}>Exportar CSV</ExportButton>
          {edit && <Button onClick={() => setNueva(true)}><Plus className="size-4" />Nueva compra</Button>}
        </div>
      </div>

      {!rows ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : rows.length === 0 ? <Empty text="No hay compras en este periodo" /> : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-xs uppercase text-white/40"><tr><th className="p-3">N°</th><th className="p-3">Fecha</th><th className="p-3">Proveedor</th><th className="p-3">Documento</th><th className="p-3">Estado</th><th className="p-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((c) => (
                  <tr key={c.id} onClick={() => abrir(c.id)} className="cursor-pointer hover:bg-white/5">
                    <td className="p-3 font-medium">#{c.id}</td><td className="p-3 text-white/60">{c.fecha}</td>
                    <td className="p-3">{c.proveedores?.razon_social || 'Sin proveedor'}</td><td className="p-3 text-white/60">{c.documento || '-'}</td>
                    <td className="p-3"><Badge tone={c.estado === 'ANULADA' ? 'rose' : 'emerald'}>{c.estado}</Badge></td>
                    <td className="p-3 text-right font-semibold">{money(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={nueva} onClose={() => setNueva(false)} title="Nueva compra" wide>
        {nueva && <NuevaCompra provs={provs} pct={pct} onClose={() => setNueva(false)} onDone={() => { setNueva(false); load() }} />}
      </Modal>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.id ? `Compra #${sel.id}` : 'Compra'} wide>
        {sel?.loading ? <Skeleton className="h-40" /> : sel && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p><b>{sel.proveedores?.razon_social || 'Sin proveedor'}</b> <span className="text-white/40">· {sel.documento || 'sin documento'} · {sel.fecha}</span></p>
              <Badge tone={sel.estado === 'ANULADA' ? 'rose' : 'emerald'}>{sel.estado}</Badge>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase text-white/40"><tr><th className="p-2.5">Producto</th><th className="p-2.5 text-center">Cant.</th><th className="p-2.5 text-right">Costo</th><th className="p-2.5 text-right">Subtotal</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {sel.compra_items.map((i) => <tr key={i.id}><td className="p-2.5">{i.productos?.nombre}</td><td className="p-2.5 text-center">{i.cantidad}</td><td className="p-2.5 text-right">{money(i.costo_unitario)}</td><td className="p-2.5 text-right">{money(i.subtotal)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-white/60"><span>Subtotal</span><span>{money(sel.subtotal)}</span></div>
              <div className="flex justify-between text-white/60"><span>IGV</span><span>{money(sel.igv)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(sel.total)}</span></div>
            </div>
            {admin && sel.estado !== 'ANULADA' && <Button variant="danger" loading={busy} onClick={anular}><Ban className="size-4" />Anular compra</Button>}
          </div>
        )}
      </Modal>
    </>
  )
}

function Proveedores() {
  const { can } = useAuth()
  const edit = can('admin', 'almacenero')
  const admin = can('admin')
  const [rows, setRows] = useState(null)
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    setRows(null)
    api.get('/proveedores' + qs({ solo_activos: false })).then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  }, [])
  useEffect(() => { load() }, [load])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    const body = {
      razon_social: f.razon_social.trim(), ruc: f.ruc.trim() || null, contacto: f.contacto.trim() || null,
      telefono: f.telefono.trim() || null, email: f.email.trim() || null, direccion: f.direccion.trim() || null,
    }
    try {
      if (f.id) await api.put(`/proveedores/${f.id}`, body); else await api.post('/proveedores', body)
      toast.success('Proveedor guardado'); setF(null); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const toggle = async (p) => {
    try {
      if (p.activo) { if (!window.confirm(`¿Desactivar a ${p.razon_social}?`)) return; await api.del(`/proveedores/${p.id}`) }
      else await api.put(`/proveedores/${p.id}`, { activo: true })
      load()
    } catch (e) { toast.error(e.message) }
  }
  const blank = { razon_social: '', ruc: '', contacto: '', telefono: '', email: '', direccion: '' }

  return (
    <>
      {edit && <div className="mb-5 flex justify-end"><Button onClick={() => setF({ ...blank })}><Plus className="size-4" />Nuevo proveedor</Button></div>}
      {!rows ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : rows.length === 0 ? <Empty text="Aún no hay proveedores" /> : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-xs uppercase text-white/40"><tr><th className="p-3">Proveedor</th><th className="p-3">RUC</th><th className="p-3">Contacto</th><th className="p-3" /></tr></thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((p) => (
                  <tr key={p.id} className={`hover:bg-white/5 ${p.activo ? '' : 'opacity-50'}`}>
                    <td className="p-3"><p className="font-medium">{p.razon_social}</p>{!p.activo && <Badge tone="rose">Inactivo</Badge>}</td>
                    <td className="p-3 text-white/60">{p.ruc || '-'}</td>
                    <td className="p-3 text-white/60">{p.contacto || '-'} {p.telefono && <span className="text-white/40">· {p.telefono}</span>}</td>
                    <td className="p-3">
                      {edit && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setF({ ...blank, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ''])) })} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="size-4" /></button>
                          {admin && <button onClick={() => toggle(p)} className={`rounded-lg px-2 text-xs ${p.activo ? 'text-rose-300 hover:bg-rose-500/10' : 'text-emerald-300 hover:bg-emerald-500/10'}`}>{p.activo ? 'Desactivar' : 'Reactivar'}</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Editar proveedor' : 'Nuevo proveedor'}>
        {f && (
          <form onSubmit={save} className="space-y-3">
            <Input label="Razón social *" required value={f.razon_social} onChange={set('razon_social')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="RUC" maxLength={11} value={f.ruc} onChange={set('ruc')} />
              <Input label="Contacto" value={f.contacto} onChange={set('contacto')} />
              <Input label="Teléfono" value={f.telefono} onChange={set('telefono')} />
              <Input label="Correo" type="email" value={f.email} onChange={set('email')} />
            </div>
            <Input label="Dirección" value={f.direccion} onChange={set('direccion')} />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setF(null)}>Cancelar</Button><Button type="submit" loading={busy}>Guardar</Button></div>
          </form>
        )}
      </Modal>
    </>
  )
}

export default function Compras() {
  const [tab, setTab] = useState('compras')
  return (
    <>
      <PageHeader title="Compras y proveedores" subtitle="Cada compra registrada aumenta el stock automáticamente" />
      <div className="glass mb-5 inline-flex rounded-xl p-1">
        {[['compras', 'Compras'], ['proveedores', 'Proveedores']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-5 py-1.5 text-sm font-medium transition ${tab === k ? 'grad-brand text-white shadow' : 'text-white/60 hover:text-white'}`}>{l}</button>
        ))}
      </div>
      {tab === 'compras' ? <ListaCompras /> : <Proveedores />}
    </>
  )
}