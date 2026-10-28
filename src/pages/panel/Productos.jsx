import { useCallback, useEffect, useState } from 'react'
import { History, PackagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, qs } from '../../lib/api'
import { fmtDateTime, money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Empty, Input, Modal, PageHeader, Select, Skeleton, Textarea } from '../../components/ui'
import { ProductThumb } from '../../components/extras'
import { descargarExcel } from '../../lib/excel'
import { ExportButton } from '../../components/extras'



const specsToText = (o = {}) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('\n')
const parseSpecs = (t) =>
  Object.fromEntries(
    t.split('\n').map((l) => l.split(':')).filter((p) => p[0].trim() && p.length > 1)
      .map(([k, ...r]) => [k.trim(), r.join(':').trim()]),
  )
const EMPTY = {
  sku: '', nombre: '', descripcion: '', categoria_id: '', marca_id: '', numero_parte: '', precio_compra: '',
  precio_venta: '', stock_minimo: '5', ubicacion: '', imagen_url: '', datasheet_url: '', specs: '',
}

export default function Productos() {
  const { can } = useAuth()
  const edit = can('admin', 'almacenero')
  const admin = can('admin')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [cat, setCat] = useState('')
  const [inact, setInact] = useState(false)
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState([])
  const [marcas, setMarcas] = useState([])
  const [form, setForm] = useState(null)
  const [stock, setStock] = useState(null)
  const [kardex, setKardex] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { const t = setTimeout(() => setQd(q), 300); return () => clearTimeout(t) }, [q])
  const loadRefs = useCallback(() => {
    api.get('/categorias').then(setCats).catch(() => {})
    api.get('/marcas').then(setMarcas).catch(() => {})
  }, [])
  useEffect(() => { loadRefs() }, [loadRefs])

  const load = useCallback(() => {
    setRows(null)
    api.get('/productos' + qs({ q: qd, categoria_id: cat, solo_activos: !inact, limit: 200 }))
      .then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  }, [qd, cat, inact])
  useEffect(() => { load() }, [load])

  const openEdit = (p) => setForm({
    id: p.id, sku: p.sku, nombre: p.nombre, descripcion: p.descripcion || '', categoria_id: p.categoria_id ? String(p.categoria_id) : '',
    marca_id: p.marca_id ? String(p.marca_id) : '', numero_parte: p.numero_parte || '', precio_compra: String(p.precio_compra ?? ''),
    precio_venta: String(p.precio_venta), stock_minimo: String(p.stock_minimo), ubicacion: p.ubicacion || '',
    imagen_url: p.imagen_url || '', datasheet_url: p.datasheet_url || '', specs: specsToText(p.especificaciones),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const quickAdd = async (tipo) => {
    const nombre = window.prompt(`Nombre de la nueva ${tipo === 'categorias' ? 'categoría' : 'marca'}`)
    if (!nombre) return
    try {
      const r = await api.post(`/${tipo}`, { nombre })
      loadRefs()
      setForm((f) => ({ ...f, [tipo === 'categorias' ? 'categoria_id' : 'marca_id']: String(r.id) }))
    } catch (e) { toast.error(e.message) }
  }

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const body = {
        sku: form.sku.trim(), nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null, marca_id: form.marca_id ? Number(form.marca_id) : null,
        numero_parte: form.numero_parte.trim() || null, especificaciones: parseSpecs(form.specs),
        precio_compra: Number(form.precio_compra || 0), precio_venta: Number(form.precio_venta),
        stock_minimo: Number(form.stock_minimo || 0), ubicacion: form.ubicacion.trim() || null,
        imagen_url: form.imagen_url.trim() || null, datasheet_url: form.datasheet_url.trim() || null,
      }
      if (form.id) await api.put(`/productos/${form.id}`, body)
      else await api.post('/productos', body)
      toast.success(form.id ? 'Producto actualizado' : 'Producto creado'); setForm(null); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const saveStock = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      await api.post(`/productos/${stock.p.id}/ajuste-stock`, { tipo: stock.tipo, cantidad: Number(stock.cantidad), motivo: stock.motivo })
      toast.success('Stock actualizado'); setStock(null); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const baja = async (p) => {
    if (!window.confirm(`¿Desactivar "${p.nombre}"? Dejará de mostrarse en la tienda y en ventas.`)) return
    try { await api.del(`/productos/${p.id}`); toast.success('Producto desactivado'); load() } catch (e) { toast.error(e.message) }
  }
  const reactivar = async (p) => {
    try { await api.put(`/productos/${p.id}`, { activo: true }); toast.success('Producto reactivado'); load() } catch (e) { toast.error(e.message) }
  }
  const verKardex = async (p) => {
    setKardex({ p, rows: null })
    try { setKardex({ p, rows: await api.get(`/productos/${p.id}/kardex`) }) } catch (e) { toast.error(e.message); setKardex(null) }
  }

  return (
    <>
      <PageHeader title="Productos" subtitle={`${rows?.length ?? '...'} productos`}>
        <div className="flex gap-2">
          <ExportButton onClick={() => rows && descargarExcel('productos', [
            { label: 'SKU', value: 'sku' }, { label: 'Producto', value: 'nombre' }, { label: 'Categoría', value: (p) => p.categorias?.nombre || '' },
            ...(edit ? [{ label: 'Costo', value: 'precio_compra' }] : []),
            { label: 'Precio sin IGV', value: 'precio_venta' }, { label: 'Stock', value: 'stock' }, { label: 'Stock mínimo', value: 'stock_minimo' },
          ], rows)}>Exportar CSV</ExportButton>
          {edit && <Button onClick={() => setForm({ ...EMPTY })}><Plus className="size-4" />Nuevo producto</Button>}
        </div>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, SKU o N° de parte..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-400/60" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="min-w-48">
          <option value="">Todas las categorías</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
        {admin && (
          <label className="flex items-center gap-2 pb-2.5 text-sm text-white/60">
            <input type="checkbox" checked={inact} onChange={(e) => setInact(e.target.checked)} /> Ver inactivos
          </label>
        )}
      </div>

      {!rows ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : rows.length === 0 ? <Empty text="No hay productos" /> : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="p-3">Producto</th><th className="p-3">Categoría</th>
                {edit && <th className="p-3 text-right">Costo</th>}
                <th className="p-3 text-right">Precio (sin IGV)</th><th className="p-3 text-center">Stock</th><th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p) => (
                <tr key={p.id} className={`hover:bg-white/5 ${p.activo ? '' : 'opacity-50'}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb p={p} className="size-11 shrink-0 rounded-lg [&_svg]:size-5" />
                      <div className="min-w-0"><p className="truncate font-medium">{p.nombre}</p><p className="text-[11px] text-white/40">{p.sku}{p.activo ? '' : ' · inactivo'}</p></div>
                    </div>
                  </td>
                  <td className="p-3 text-white/60">{p.categorias?.nombre || '-'}</td>
                  {edit && <td className="p-3 text-right text-white/60">{money(p.precio_compra)}</td>}
                  <td className="p-3 text-right font-semibold">{money(p.precio_venta)}</td>
                  <td className="p-3 text-center"><Badge tone={p.stock <= 0 ? 'rose' : p.stock <= p.stock_minimo ? 'amber' : 'emerald'}>{p.stock}</Badge></td>
                  <td className="p-3">
                    {edit && (
                      <div className="flex justify-end gap-1">
                        <button title="Ajustar stock" onClick={() => setStock({ p, tipo: 'ENTRADA', cantidad: '', motivo: '' })} className="rounded-lg p-2 hover:bg-white/10"><PackagePlus className="size-4" /></button>
                        <button title="Kardex" onClick={() => verKardex(p)} className="rounded-lg p-2 hover:bg-white/10"><History className="size-4" /></button>
                        <button title="Editar" onClick={() => openEdit(p)} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="size-4" /></button>
                        {admin && (p.activo
                          ? <button title="Desactivar" onClick={() => baja(p)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="size-4" /></button>
                          : <button title="Reactivar" onClick={() => reactivar(p)} className="rounded-lg px-2 text-xs text-emerald-300 hover:bg-emerald-500/10">Reactivar</button>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar producto' : 'Nuevo producto'} wide>
        {form && (
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Input label="SKU *" required value={form.sku} onChange={set('sku')} />
            <Input label="Nombre *" required value={form.nombre} onChange={set('nombre')} />
            <div className="flex items-end gap-2">
              <div className="flex-1"><Select label="Categoría" value={form.categoria_id} onChange={set('categoria_id')}><option value="">Sin categoría</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></div>
              <Button type="button" variant="ghost" onClick={() => quickAdd('categorias')}><Plus className="size-4" /></Button>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Select label="Marca" value={form.marca_id} onChange={set('marca_id')}><option value="">Sin marca</option>{marcas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></div>
              <Button type="button" variant="ghost" onClick={() => quickAdd('marcas')}><Plus className="size-4" /></Button>
            </div>
            <Input label="Precio de compra (sin IGV)" type="number" step="0.01" min="0" value={form.precio_compra} onChange={set('precio_compra')} />
            <Input label="Precio de venta (sin IGV) *" type="number" step="0.01" min="0" required value={form.precio_venta} onChange={set('precio_venta')} />
            <Input label="Stock mínimo" type="number" min="0" value={form.stock_minimo} onChange={set('stock_minimo')} />
            <Input label="N° de parte" value={form.numero_parte} onChange={set('numero_parte')} />
            <Input label="Ubicación (estante)" value={form.ubicacion} onChange={set('ubicacion')} />
            <Input label="URL de imagen" value={form.imagen_url} onChange={set('imagen_url')} />
            <div className="sm:col-span-2"><Input label="URL del datasheet" value={form.datasheet_url} onChange={set('datasheet_url')} /></div>
            <div className="sm:col-span-2"><Textarea label="Descripción" rows={2} value={form.descripcion} onChange={set('descripcion')} /></div>
            <div className="sm:col-span-2"><Textarea label="Especificaciones (una por línea, formato nombre: valor)" rows={4} placeholder={'voltaje: 5V\nencapsulado: DIP-28'} value={form.specs} onChange={set('specs')} /></div>
            {!form.id && <p className="text-xs text-white/40 sm:col-span-2">El stock inicial es 0. Cárgalo con "Ajustar stock" o registrando una compra.</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
              <Button type="submit" loading={busy}>Guardar</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!stock} onClose={() => setStock(null)} title={`Ajustar stock: ${stock?.p.nombre}`}>
        {stock && (
          <form onSubmit={saveStock} className="space-y-3">
            <p className="text-sm text-white/60">Stock actual: <b className="text-white">{stock.p.stock}</b></p>
            <Select label="Tipo" value={stock.tipo} onChange={(e) => setStock({ ...stock, tipo: e.target.value })}>
              <option value="ENTRADA">Entrada (suma stock)</option><option value="AJUSTE">Ajuste (suma o resta)</option>
            </Select>
            <Input label={stock.tipo === 'AJUSTE' ? 'Cantidad (negativa para restar)' : 'Cantidad'} type="number" required value={stock.cantidad} onChange={(e) => setStock({ ...stock, cantidad: e.target.value })} />
            <Input label="Motivo" required minLength={3} value={stock.motivo} onChange={(e) => setStock({ ...stock, motivo: e.target.value })} />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setStock(null)}>Cancelar</Button><Button type="submit" loading={busy}>Aplicar</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!kardex} onClose={() => setKardex(null)} title={`Kardex: ${kardex?.p.nombre}`} wide>
        {!kardex?.rows ? <Skeleton className="h-40" /> : kardex.rows.length === 0 ? <Empty text="Sin movimientos" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="text-xs uppercase text-white/40"><tr><th className="pb-2">Fecha</th><th className="pb-2">Tipo</th><th className="pb-2">Motivo</th><th className="pb-2 text-right">Cantidad</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {kardex.rows.map((r) => (
                  <tr key={r.id}><td className="py-2 text-white/50">{fmtDateTime(r.fecha)}</td><td className="py-2"><Badge tone={r.cantidad > 0 ? 'emerald' : 'rose'}>{r.tipo}</Badge></td><td className="py-2 text-white/70">{r.motivo}</td><td className={`py-2 text-right font-semibold ${r.cantidad > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{r.cantidad > 0 ? '+' : ''}{r.cantidad}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  )
}