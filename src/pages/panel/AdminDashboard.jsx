import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, Boxes, HandCoins, Package, Receipt, ShoppingBag, ShoppingCart, Target, TrendingUp, Truck, UserCog, Users, Wallet,
} from 'lucide-react'
import { api, qs } from '../../lib/api'
import { daysAgo, fmtDateTime, limaDate, money, monthStart, num } from '../../lib/format'
import { descargarExcel } from '../../lib/excel'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, KpiCard, PageHeader, Reveal, Skeleton } from '../../components/ui'
import { ExportButton, QuickActions } from '../../components/extras'

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa']
const RANGOS = { 7: ['7 días', () => daysAgo(6)], 30: ['30 días', () => daysAgo(29)], mes: ['Este mes', monthStart] }
const tip = {
  contentStyle: { background: '#14163a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#fff' },
  labelStyle: { color: '#a5b4fc' }, itemStyle: { color: '#fff' },
}
const tick = { fill: 'rgba(255,255,255,.5)', fontSize: 11 }
const ESTADO = { PAGADA: 'emerald', PENDIENTE: 'amber', ANULADA: 'rose' }
const short = (s = '') => (s.length > 14 ? s.slice(0, 13) + '…' : s)
const noon = (iso) => new Date(iso + 'T12:00:00')
const shift = (iso, n) => { const d = noon(iso); d.setDate(d.getDate() - n); return limaDate(d) }
const diffDays = (a, b) => Math.round((noon(b) - noon(a)) / 86400000)
const pc = (a, b) => (Number(b) > 0 ? ((Number(a) - Number(b)) / Number(b)) * 100 : null)
const ACC = [
  { to: '/panel/vender', label: 'Nueva venta', icon: ShoppingCart, grad: 'grad-violet', roles: ['admin'] },
  { to: '/panel/pedidos', label: 'Pedidos web', icon: ShoppingBag, grad: 'grad-pink', roles: ['admin'] },
  { to: '/panel/productos', label: 'Productos', icon: Package, grad: 'grad-cyan', roles: ['admin'] },
  { to: '/panel/compras', label: 'Compras', icon: Truck, grad: 'grad-emerald', roles: ['admin', 'contador'] },
  { to: '/panel/ventas', label: 'Ventas', icon: Receipt, grad: 'grad-amber', roles: ['contador'] },
  { to: '/panel/clientes', label: 'Clientes', icon: Users, grad: 'grad-cyan', roles: ['contador'] },
  { to: '/panel/usuarios', label: 'Usuarios', icon: UserCog, grad: 'grad-brand', roles: ['admin'] },
]

export default function AdminDashboard() {
  const { user, can } = useAuth()
  const isAdmin = can('admin')
  const [r, setR] = useState('30')
  const [d, setD] = useState(null)

  useEffect(() => {
    setD(null)
    const desde = RANGOS[r][1]()
    const hasta = limaDate()
    const n = diffDays(desde, hasta) + 1
    const p = (extra = {}) => qs({ desde, hasta, ...extra })
    const prev = qs({ desde: shift(desde, n), hasta: shift(desde, 1) })
    const ok = (x) => x.catch(() => null)
    const solo = (fn) => (isAdmin ? ok(fn()) : Promise.resolve(null))
    Promise.all([
      ok(api.get('/reportes/resumen-ventas' + p())),
      ok(api.get('/reportes/ganancias' + p())),
      ok(api.get('/reportes/valor-inventario')),
      ok(api.get('/reportes/ventas-por-dia' + p())),
      ok(api.get('/reportes/top-productos' + p({ limit: 6 }))),
      ok(api.get('/reportes/ventas-por-vendedor' + p())),
      solo(() => api.get('/reportes/stock-bajo')),
      ok(api.get('/ventas' + qs({ limit: 8 }))),
      solo(() => api.get('/pedidos' + qs({ estado: 'NUEVO' }))),
      ok(api.get('/reportes/resumen-ventas' + prev)),
      ok(api.get('/reportes/ganancias' + prev)),
      ok(api.get('/ventas' + qs({ estado: 'PENDIENTE', limit: 200 }))),
      solo(() => api.get('/reportes/ventas-por-vendedor' + qs({ desde: monthStart(), hasta }))),
      solo(() => api.get('/usuarios')),
    ]).then(([resumen, gan, inv, dia, top, vend, bajo, ventas, pedidos, pRes, pGan, pend, vendMes, usuarios]) => {
      const cobrar = (pend || [])
        .map((v) => ({ ...v, saldo: Number(v.total) - (v.pagos || []).reduce((s, x) => s + Number(x.monto), 0) }))
        .filter((v) => v.saldo > 0.01).sort((a, b) => b.saldo - a.saldo)
      const metas = (usuarios || []).filter((u) => u.rol === 'vendedor' && Number(u.meta_mensual) > 0).map((u) => {
        const vendido = Number((vendMes || []).find((x) => x.vendedor_id === u.id)?.total || 0)
        return { id: u.id, nombre: `${u.nombres} ${u.apellidos}`.trim() || u.email, meta: Number(u.meta_mensual), vendido }
      })
      setD({
        resumen, gan, inv, bajo, ventas: ventas || [], pedidos, cobrar, metas,
        dVentas: pc(resumen?.total, pRes?.total), dUtil: pc(gan?.utilidad, pGan?.utilidad),
        dia: (dia || []).map((x) => ({ ...x, total: Number(x.total) })),
        top: (top || []).map((x) => ({ ...x, unidades: Number(x.unidades) })),
        vend: (vend || []).map((x) => ({ ...x, total: Number(x.total) })),
      })
    })
  }, [r, isAdmin])

  const totalCobrar = d ? d.cobrar.reduce((s, v) => s + v.saldo, 0) : 0

  return (
    <>
      <PageHeader title={`Hola, ${user.nombre?.split(' ')[0] || 'bienvenido'}`} subtitle="Resumen general del negocio (comparado con el periodo anterior)">
        <div className="glass flex rounded-xl p-1">
          {Object.entries(RANGOS).map(([k, [label]]) => (
            <button key={k} onClick={() => setR(k)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${r === k ? 'grad-brand text-white shadow' : 'text-white/60 hover:text-white'}`}>{label}</button>
          ))}
        </div>
      </PageHeader>

      <QuickActions items={ACC.filter((a) => a.roles.includes(user.rol))} />

      {!d ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)}</div>
          <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard icon={TrendingUp} label="Ventas" value={d.resumen?.total} format={money} grad="grad-violet" delta={d.dVentas} sub={`${num(d.resumen?.cantidad_ventas)} ventas`} />
            <KpiCard icon={Wallet} label="Utilidad" value={d.gan?.utilidad} format={money} grad="grad-emerald" delay={0.07} delta={d.dUtil} sub={`Margen ${d.gan?.margen_pct ?? 0}%`} />
            <KpiCard icon={HandCoins} label="Por cobrar" value={totalCobrar} format={money} grad="grad-amber" delay={0.14} sub={`${d.cobrar.length} ventas pendientes`} />
            {isAdmin ? (
              <KpiCard icon={ShoppingBag} label="Pedidos web nuevos" value={d.pedidos?.length} grad="grad-pink" delay={0.21} sub={<Link to="/panel/pedidos" className="text-cyan-300 hover:underline">Atender</Link>} />
            ) : (
              <KpiCard icon={Receipt} label="Ticket promedio" format={money} grad="grad-pink" delay={0.21} sub="Por venta"
                value={d.resumen?.cantidad_ventas ? d.resumen.total / d.resumen.cantidad_ventas : 0} />
            )}
            <KpiCard icon={Boxes} label="Inventario (a costo)" value={d.inv?.valor_costo} format={money} grad="grad-cyan" delay={0.28} sub={`${num(d.inv?.unidades)} unidades`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between"><h3 className="font-display font-semibold">Ventas por día</h3>
                  <ExportButton onClick={() => descargarExcel('ventas_por_dia', [{ label: 'Día', value: 'dia' }, { label: 'Ventas', value: 'cantidad_ventas' }, { label: 'Total', value: 'total' }], d.dia)} /></div>
                {d.dia.length === 0 ? <Empty text="Sin ventas en este periodo" /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <AreaChart data={d.dia}>
                      <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={(x) => x.slice(5)} tick={tick} axisLine={false} tickLine={false} />
                      <YAxis tick={tick} axisLine={false} tickLine={false} width={55} />
                      <Tooltip {...tip} formatter={(v) => money(v)} />
                      <Area type="monotone" dataKey="total" name="Ventas" stroke="#a78bfa" strokeWidth={3} fill="url(#gv)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="h-full p-5">
                <div className="mb-2 flex items-center justify-between"><h3 className="font-display font-semibold">Ventas por vendedor</h3>
                  <ExportButton onClick={() => descargarExcel('ventas_por_vendedor', [{ label: 'Vendedor', value: 'vendedor' }, { label: 'Ventas', value: 'cantidad_ventas' }, { label: 'Total', value: 'total' }], d.vend)} /></div>
                {d.vend.length === 0 ? <Empty text="Sin datos" /> : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={d.vend} dataKey="total" nameKey="vendedor" innerRadius={50} outerRadius={80} paddingAngle={4} stroke="none">
                          {d.vend.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tip} formatter={(v) => money(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {d.vend.map((v, i) => (
                        <li key={v.vendedor_id} className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="truncate">{v.vendedor || 'Sin nombre'}</span></span>
                          <span className="text-white/60">{money(v.total)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </Reveal>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between"><h3 className="font-display font-semibold">Productos más vendidos (unidades)</h3>
                  <ExportButton onClick={() => descargarExcel('top_productos', [{ label: 'SKU', value: 'sku' }, { label: 'Producto', value: 'nombre' }, { label: 'Unidades', value: 'unidades' }, { label: 'Ingresos', value: 'ingresos' }, { label: 'Utilidad', value: 'utilidad' }], d.top)} /></div>
                {d.top.length === 0 ? <Empty text="Sin ventas en este periodo" /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={d.top} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} />
                      <XAxis type="number" tick={tick} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nombre" tickFormatter={short} tick={tick} width={110} axisLine={false} tickLine={false} />
                      <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                      <Bar dataKey="unidades" name="Unidades" radius={[0, 8, 8, 0]}>{d.top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="h-full p-5">
                <h3 className="font-display mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-amber-300" /> Stock bajo</h3>
                {!isAdmin ? <Empty text="Solo visible para administradores" /> : !d.bajo?.length ? <Empty text="Todo el stock está en orden" /> : (
                  <ul className="max-h-72 space-y-2 overflow-y-auto">
                    {d.bajo.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                        <span className="min-w-0"><p className="truncate font-medium">{p.nombre}</p><p className="text-[11px] text-white/40">{p.sku}</p></span>
                        <Badge tone={p.stock === 0 ? 'rose' : 'amber'}>{p.stock} / {p.stock_minimo}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Reveal>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Reveal>
              <Card className="h-full p-5">
                <h3 className="font-display mb-3 flex items-center gap-2 font-semibold"><HandCoins className="size-4 text-amber-300" /> Ventas por cobrar</h3>
                {d.cobrar.length === 0 ? <Empty text="No hay saldos pendientes" /> : (
                  <ul className="max-h-72 space-y-2 overflow-y-auto">
                    {d.cobrar.slice(0, 8).map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                        <span className="min-w-0"><p className="truncate font-medium">{v.clientes?.nombre || 'Cliente varios'}</p><p className="text-[11px] text-white/40">{v.serie}-{String(v.numero).padStart(6, '0')} · {fmtDateTime(v.fecha)}</p></span>
                        <b className="text-amber-300">{money(v.saldo)}</b>
                      </li>
                    ))}
                  </ul>
                )}
                {d.cobrar.length > 0 && <Link to="/panel/ventas" className="mt-3 block text-sm text-cyan-300 hover:underline">Ir a ventas</Link>}
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="h-full p-5">
                <h3 className="font-display mb-3 flex items-center gap-2 font-semibold"><Target className="size-4 text-cyan-300" /> Metas del mes</h3>
                {!isAdmin ? <Empty text="Solo visible para administradores" /> : d.metas.length === 0 ? <Empty text="Asigna una meta a tus vendedores en Usuarios" /> : (
                  <ul className="space-y-4">
                    {d.metas.map((m) => {
                      const pct = (m.vendido / m.meta) * 100
                      return (
                        <li key={m.id}>
                          <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{m.nombre}</span><span className="text-white/60">{money(m.vendido)} / {money(m.meta)}</span></div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                            <motion.div className={`${pct >= 100 ? 'grad-emerald' : 'grad-brand'} h-full rounded-full`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 1 }} />
                          </div>
                          <p className="mt-0.5 text-right text-[11px] text-white/40">{pct.toFixed(0)}%{pct >= 100 ? ' · ¡Meta cumplida!' : ''}</p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </Reveal>
          </div>

          <Reveal>
            <Card className="p-5">
              <h3 className="font-display mb-3 font-semibold">Últimas ventas</h3>
              {d.ventas.length === 0 ? <Empty text="Aún no hay ventas" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-xs uppercase text-white/40"><tr><th className="pb-2">Comprobante</th><th className="pb-2">Cliente</th><th className="pb-2">Estado</th><th className="pb-2">Fecha</th><th className="pb-2 text-right">Total</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {d.ventas.map((v) => (
                        <tr key={v.id} className="hover:bg-white/5">
                          <td className="py-2.5 font-medium">{v.serie}-{String(v.numero).padStart(6, '0')}</td>
                          <td className="py-2.5 text-white/70">{v.clientes?.nombre || 'Cliente varios'}</td>
                          <td className="py-2.5"><Badge tone={ESTADO[v.estado]}>{v.estado}</Badge></td>
                          <td className="py-2.5 text-white/50">{fmtDateTime(v.fecha)}</td>
                          <td className="py-2.5 text-right font-semibold">{money(v.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </Reveal>
        </div>
      )}
    </>
  )
}