import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Pencil, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Empty, Input, Modal, PageHeader, Select, Skeleton } from '../../components/ui'

const ROLES = ['admin', 'vendedor', 'almacenero', 'contador']
const TONE = { admin: 'rose', vendedor: 'cyan', almacenero: 'amber', contador: 'emerald' }
const NEW = { email: '', password: '', nombres: '', apellidos: '', rol: 'vendedor', telefono: '', meta_mensual: '' }

export default function Usuarios() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [f, setF] = useState(null)
  const [pw, setPw] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setRows(null)
    api.get('/usuarios').then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  }, [])
  useEffect(() => { load() }, [load])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const meta = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

    const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      if (f.id) {
        const nueva = meta(f.meta_mensual)
        const r = await api.patch(`/usuarios/${f.id}`, {
          nombres: f.nombres.trim(), apellidos: f.apellidos.trim(), telefono: f.telefono || null,
          rol: f.rol, activo: f.activo, meta_mensual: nueva,
        })
        if (f.rol === 'vendedor' && Number(r.meta_mensual ?? 0) !== Number(nueva ?? 0)) {
          toast.error('El servidor no guardó la meta: revisa que UsuarioUpdate (backend) tenga el campo meta_mensual.')
        } else {
          toast.success('Usuario actualizado')
        }
      } else {
        await api.post('/usuarios', {
          email: f.email.trim(), password: f.password, nombres: f.nombres.trim(), apellidos: f.apellidos.trim(),
          rol: f.rol, telefono: f.telefono || null, meta_mensual: meta(f.meta_mensual),
        })
        toast.success('Empleado creado y activado')
      }
      setF(null); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const quick = async (u, activo) => {
    try { await api.patch(`/usuarios/${u.id}`, { activo }); load() } catch (e) { toast.error(e.message) }
  }
  const savePw = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api.post(`/usuarios/${pw.u.id}/password`, { password: pw.v }); toast.success('Contraseña actualizada'); setPw(null) }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Crea empleados, asigna roles y metas">
        <Button onClick={() => setF({ ...NEW })}><Plus className="size-4" />Nuevo empleado</Button>
      </PageHeader>

      {!rows ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : rows.length === 0 ? <Empty text="No hay usuarios" /> : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-white/40"><tr><th className="p-3">Usuario</th><th className="p-3">Rol</th><th className="p-3">Meta mensual</th><th className="p-3">Estado</th><th className="p-3" /></tr></thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="p-3"><p className="font-medium">{`${u.nombres} ${u.apellidos}`.trim() || 'Sin nombre'}{u.id === user.id && <span className="ml-2 text-[11px] text-cyan-300">(tú)</span>}</p><p className="text-[11px] text-white/40">{u.email}</p></td>
                    <td className="p-3"><Badge tone={TONE[u.rol]}>{u.rol}</Badge></td>
                    <td className="p-3 text-white/60">{u.rol === 'vendedor' ? (u.meta_mensual ? money(u.meta_mensual) : 'Sin meta') : '-'}</td>
                    <td className="p-3">
                      <button disabled={u.id === user.id} onClick={() => quick(u, !u.activo)} className="disabled:opacity-40">
                        <Badge tone={u.activo ? 'emerald' : 'amber'}>{u.activo ? 'Activo' : 'Pendiente / inactivo'}</Badge>
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button title="Editar" onClick={() => setF({ ...u, nombres: u.nombres || '', apellidos: u.apellidos || '', telefono: u.telefono || '', meta_mensual: u.meta_mensual ?? '' })} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="size-4" /></button>
                        <button title="Cambiar contraseña" onClick={() => setPw({ u, v: '' })} className="rounded-lg p-2 hover:bg-white/10"><KeyRound className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Editar usuario' : 'Nuevo empleado'}>
        {f && (
          <form onSubmit={save} className="space-y-3">
            {!f.id && (
              <>
                <Input label="Correo *" type="email" required value={f.email} onChange={set('email')} />
                <Input label="Contraseña inicial * (mínimo 8)" type="text" required minLength={8} value={f.password} onChange={set('password')} />
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombres *" required value={f.nombres} onChange={set('nombres')} />
              <Input label="Apellidos" value={f.apellidos} onChange={set('apellidos')} />
              <Select label="Rol" value={f.rol} onChange={set('rol')}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
              <Input label="Teléfono" value={f.telefono} onChange={set('telefono')} />
            </div>
            {f.rol === 'vendedor' && <Input label="Meta mensual de ventas (S/)" type="number" min="0" step="0.01" value={f.meta_mensual} onChange={set('meta_mensual')} />}
            {f.id && f.id !== user.id && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Usuario activo</label>
            )}
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setF(null)}>Cancelar</Button><Button type="submit" loading={busy}>Guardar</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!pw} onClose={() => setPw(null)} title="Cambiar contraseña">
        {pw && (
          <form onSubmit={savePw} className="space-y-3">
            <p className="text-sm text-white/60">{pw.u.email}</p>
            <Input label="Nueva contraseña (mínimo 8)" required minLength={8} value={pw.v} onChange={(e) => setPw({ ...pw, v: e.target.value })} />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPw(null)}>Cancelar</Button><Button type="submit" loading={busy}>Actualizar</Button></div>
          </form>
        )}
      </Modal>
    </>
  )
}