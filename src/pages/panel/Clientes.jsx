import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Pencil, Plus, Search, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, qs } from '../../lib/api'
import { descargarExcel } from '../../lib/excel'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Empty, Input, Modal, PageHeader, Select, Skeleton } from '../../components/ui'
import { ExportButton } from '../../components/extras'

const EMPTY = { tipo_doc: 'DNI', numero_doc: '', nombre: '', direccion: '', telefono: '', email: '' }
const wa = (t = '') => {
  const d = t.replace(/\D/g, '')
  return `https://wa.me/${d.length === 9 ? '51' + d : d}`
}

export default function Clientes() {
  const { can } = useAuth()
  const edit = can('admin', 'vendedor')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [rows, setRows] = useState(null)
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { const t = setTimeout(() => setQd(q), 300); return () => clearTimeout(t) }, [q])
  const load = useCallback(() => {
    setRows(null)
    api.get('/clientes' + qs({ q: qd, limit: 200 })).then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  }, [qd])
  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const autocompletar = async () => {
    try {
      const r = await api.get(`/consultas/${f.tipo_doc === 'RUC' ? 'ruc' : 'dni'}/${f.numero_doc}`)
      setF((s) => ({ ...s, nombre: r.nombre || s.nombre, direccion: r.direccion || s.direccion }))
      toast.success('Datos encontrados')
    } catch (e) { toast.error(e.message) }
  }

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const comun = {
        nombre: f.nombre.trim(), direccion: f.direccion.trim() || null,
        telefono: f.telefono.trim() || null, email: f.email.trim() || null,
      }
      if (f.id) await api.put(`/clientes/${f.id}`, comun)
      else await api.post('/clientes', { tipo_doc: f.tipo_doc, numero_doc: f.numero_doc.trim(), ...comun })
      toast.success(f.id ? 'Cliente actualizado' : 'Cliente creado'); setF(null); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${rows?.length ?? '...'} clientes`}>
        <div className="flex gap-2">
          <ExportButton onClick={() => rows && descargarExcel('clientes', [
            { label: 'Tipo doc', value: 'tipo_doc' }, { label: 'Documento', value: 'numero_doc' }, { label: 'Nombre', value: 'nombre' },
            { label: 'Teléfono', value: 'telefono' }, { label: 'Correo', value: 'email' }, { label: 'Dirección', value: 'direccion' },
          ], rows)}>Exportar CSV</ExportButton>
          {edit && <Button onClick={() => setF({ ...EMPTY })}><Plus className="size-4" />Nuevo cliente</Button>}
        </div>
      </PageHeader>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o documento..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-400/60" />
      </div>

      {!rows ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : rows.length === 0 ? <Empty text="No hay clientes" /> : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-white/40"><tr><th className="p-3">Cliente</th><th className="p-3">Documento</th><th className="p-3">Contacto</th><th className="p-3" /></tr></thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5">
                    <td className="p-3"><p className="font-medium">{c.nombre}</p>{c.direccion && <p className="max-w-xs truncate text-[11px] text-white/40">{c.direccion}</p>}</td>
                    <td className="p-3"><Badge tone={c.tipo_doc === 'RUC' ? 'violet' : 'cyan'}>{c.tipo_doc}</Badge> <span className="text-white/70">{c.numero_doc}</span></td>
                    <td className="p-3 text-white/60">{c.telefono || '-'}{c.email && <p className="text-[11px] text-white/40">{c.email}</p>}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {c.telefono && <a href={wa(c.telefono)} target="_blank" rel="noreferrer" title="WhatsApp" className="rounded-lg p-2 text-emerald-300 hover:bg-emerald-500/10"><MessageCircle className="size-4" /></a>}
                        {edit && <button title="Editar" onClick={() => setF({ ...EMPTY, ...c, direccion: c.direccion || '', telefono: c.telefono || '', email: c.email || '' })} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="size-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Editar cliente' : 'Nuevo cliente'}>
        {f && (
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Documento" disabled={!!f.id} value={f.tipo_doc} onChange={set('tipo_doc')}>
                <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option>
              </Select>
              <Input label="Número *" required disabled={!!f.id} value={f.numero_doc} onChange={set('numero_doc')} />
            </div>
            {!f.id && ['DNI', 'RUC'].includes(f.tipo_doc) && (
              <Button type="button" variant="ghost" onClick={autocompletar}><Wand2 className="size-4" />Autocompletar con el documento</Button>
            )}
            <Input label="Nombre o razón social *" required value={f.nombre} onChange={set('nombre')} />
            <Input label="Dirección" value={f.direccion} onChange={set('direccion')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Teléfono" value={f.telefono} onChange={set('telefono')} />
              <Input label="Correo" type="email" value={f.email} onChange={set('email')} />
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setF(null)}>Cancelar</Button><Button type="submit" loading={busy}>Guardar</Button></div>
          </form>
        )}
      </Modal>
    </>
  )
}