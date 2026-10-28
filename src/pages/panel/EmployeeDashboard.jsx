import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertTriangle, CalendarDays, HandCoins, Package, PackageX, Receipt, ShoppingBag, ShoppingCart, Target, Truck, Wallet,
} from 'lucide-react'
import { api, qs } from '../../lib/api'
import { daysAgo, fmtDateTime, limaDate, money, monthStart } from '../../lib/format'
import { descargarExcel } from '../../lib/excel'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, KpiCard, PageHeader, Reveal, Skeleton } from '../../components/ui'
import { ExportButton, QuickActions } from '../../components/extras'

const tip = {
  contentStyle: { background: '#14163a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#fff' },
  labelStyle: { color: '#a5b4fc' }, itemStyle: { color: '#fff' },
}
const tick = { fill: 'rgba(255,255,255,.5)', fontSize: 11 }
const ESTADO = { PAGADA: 'emerald', PENDIENTE: 'amber', ANULADA: 'rose' }
const pc = (a, b) => (Number(b) > 0 ? ((Number(a) - Number(b)) / Number(b)) * 100 : null)
const sum = (arr) => arr.reduce((s, v) => s + Number(v.total), 0)

function Ring({ pct }) {
  const R = 52
  const C = 2 * Math.PI * R
  return (
    <svg viewBox="0 0 120 120" className="size-36 shrink-0">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
      <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
      <motion.circle cx="60" cy="60" r={R} fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C}
        initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - Math.min(pct, 100) / 100) }}
        transition={{ duration: 1.2, ease: 'easeOut' }} transform="rotate(-90 60 60)" />
      <text x="60" y="68" textAnchor="middle" fill="#fff" style={{ fontSize: 26, fontWeight: 700 }}>{Math.round(pct)}%</text>
    </svg>
  )
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const vend = user.rol === 'vendedor'
  const [d, setD] = useState(null)

  useEffect(() => {
    const ok = (p) => p.catch(() => null)
    if (vend) {
      Promise.all([
        ok(api.get('/usuarios/me')),
        ok(api.get('/ventas' + qs({ desde: daysAgo(30), limit: 200 }))),
        ok(api.get('/pedidos' + qs({ estado: 'NUEVO' }))),
        ok(api.get('/ventas' + qs({ estado: 'PENDIENTE', limit: 200 }))),
      ]).then(([me, ventas, pedidos, pend]) => setD({ me, ventas: ventas || [], pedidos: pedidos || [], pend: pend || [] }))
    } else {
      Promise.all([ok(api.get('/reportes/stock-bajo')), ok(api.get('/compras' + qs({ limit: 5 })))])
        .then(([bajo, compras]) => setD({ bajo: bajo || [], compras: compras || [] }))
    }
  }, [vend])

  let kpis = [], chart = [], extra = {}
  if (d && vend) {
    const validas = d.ventas.filter((v) => v.estado !== 'ANULADA')
    const dia = (f) => validas.filter((v) => limaDate(v.fecha) === f)
    const hoy = dia(limaDate())
    const ayer = dia(daysAgo(1))
    const mes = validas.filter((v) => limaDate(v.fecha) >= monthStart())
    const cobrar = d.pend
      .map((v) => ({ ...v, saldo: Number(v.total) - (v.pagos || []).reduce((s, x) => s + Number(x.monto), 0) }))
      .filter((v) => v.saldo > 0.01)
    const meta = Number(d.me?.meta_mensual) || 0
    extra = { cobrar, meta, vendidoMes: sum(mes) }
    kpis = [
      { icon: Wallet, label: 'Vendido hoy', value: sum(hoy), format: money, grad: 'grad-violet', delta: pc(sum(hoy), sum(ayer)), sub: `${hoy.length} ventas · vs ayer` },
      { icon: CalendarDays, label: 'Vendido este mes', value: sum(mes), format: money, grad: 'grad-cyan', sub: `${mes.length} ventas` },
      { icon: HandCoins, label: 'Por cobrar', value: cobrar.reduce((s, v) => s + v.saldo, 0), format: money, grad: 'grad-amber', sub: `${cobrar.length} ventas pendientes` },
      { icon: ShoppingBag, label: 'Pedidos web nuevos', value: d.pedidos.length, grad: 'grad-pink', sub: <Link to="/panel/pedidos" className="text-cyan-300 hover:underline">Atender pedidos</Link> },
    ]
    chart = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i)).map((f) => ({ dia: f.slice(5), total: sum(dia(f)) }))
  }
  if (d && !vend) {
    kpis = [
      { icon: AlertTriangle, label: 'Con stock bajo', value: d.bajo.length, grad: 'grad-amber', sub: 'Requieren reposición' },
      { icon: PackageX, label: 'Agotados', value: d.bajo.filter((p) => p.stock === 0).length, grad: 'grad-pink', sub: 'Sin unidades' },
      { icon: Truck, label: 'Compras recientes', value: sum(d.compras.filter((c) => c.estado !== 'ANULADA')), format: money, grad: 'grad-emerald', sub: `Últimas ${d.compras.length} compras` },
    ]
    chart = d.bajo.slice(0, 8).map((p) => ({ sku: p.sku, stock: p.stock, minimo: p.stock_minimo }))
  }

  const acc = vend
    ? [
      { to: '/panel/vender', label: 'Nueva venta', icon: ShoppingCart, grad: 'grad-violet' },
      { to: '/panel/pedidos', label: 'Pedidos web', icon: ShoppingBag, grad: 'grad-pink' },
      { to: '/panel/ventas', label: 'Mis ventas', icon: Receipt, grad: 'grad-amber' },
      { to: '/panel/productos', label: 'Productos', icon: Package, grad: 'grad-cyan' },
    ]
    : [
      { to: '/panel/compras', label: 'Registrar compra', icon: Truck, grad: 'grad-emerald' },
      { to: '/panel/productos', label: 'Ajustar stock', icon: Package, grad: 'grad-cyan' },
    ]

  return (
    <>
      <PageHeader title={`Hola, ${user.nombre?.split(' ')[0] || 'bienvenido'}`} subtitle={vend ? 'Tu actividad de ventas' : 'Estado del inventario'}>
        <Badge tone="violet">{new Date().toLocaleDateString('es-PE', { dateStyle: 'full', timeZone: 'America/Lima' })}</Badge>
      </PageHeader>

      <QuickActions items={acc} />

      {!d ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className={`grid gap-4 sm:grid-cols-2 ${vend ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
            {kpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 0.07} />)}
          </div>

          {vend && (
            <Reveal>
              <Card className="flex flex-wrap items-center gap-6 p-5">
                {extra.meta > 0 ? (
                  <>
                    <Ring pct={(extra.vendidoMes / extra.meta) * 100} />
                    <div>
                      <h3 className="font-display flex items-center gap-2 text-lg font-bold"><Target className="size-5 text-cyan-300" /> Tu meta del mes</h3>
                      <p className="mt-1 text-white/60">Llevas <b className="text-white">{money(extra.vendidoMes)}</b> de <b className="text-white">{money(extra.meta)}</b></p>
                      <p className="mt-1 text-sm text-white/50">
                        {extra.vendidoMes >= extra.meta ? '¡Meta cumplida! Sigue así.' : `Te faltan ${money(extra.meta - extra.vendidoMes)} para llegar.`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-white/60"><Target className="size-8 text-white/30" />Aún no tienes una meta mensual asignada. Tu administrador puede configurarla en Usuarios.</div>
                )}
              </Card>
            </Reveal>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <Card className="p-5">
                <h3 className="font-display mb-4 font-semibold">{vend ? 'Mis ventas de los últimos 7 días' : 'Stock actual vs. mínimo'}</h3>
                {chart.length === 0 ? <Empty text="Sin datos para mostrar" /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={chart}>
                      <defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient></defs>
                      <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                      <XAxis dataKey={vend ? 'dia' : 'sku'} tick={tick} axisLine={false} tickLine={false} />
                      <YAxis tick={tick} axisLine={false} tickLine={false} width={50} />
                      <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.04)' }} formatter={(v) => (vend ? money(v) : v)} />
                      {vend ? <Bar dataKey="total" name="Ventas" fill="url(#gb)" radius={[8, 8, 0, 0]} /> : (
                        <>
                          <Bar dataKey="stock" name="Stock" radius={[8, 8, 0, 0]}>{chart.map((c, i) => <Cell key={i} fill={c.stock === 0 ? '#f472b6' : '#fbbf24'} />)}</Bar>
                          <Bar dataKey="minimo" name="Mínimo" fill="#60a5fa" radius={[8, 8, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card className="h-full p-5">
                {vend ? (
                  <>
                    <h3 className="font-display mb-3 font-semibold">Pedidos por atender</h3>
                    {d.pedidos.length === 0 ? <Empty icon={ShoppingBag} text="No hay pedidos nuevos" /> : (
                      <ul className="space-y-2">
                        {d.pedidos.slice(0, 5).map((p) => (
                          <li key={p.id} className="rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                            <div className="flex justify-between"><span className="font-medium">#{p.id} · {p.nombre}</span><span className="text-cyan-300">{money(p.total)}</span></div>
                            <p className="text-[11px] text-white/40">{fmtDateTime(p.created_at)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between"><h3 className="font-display font-semibold">Productos a reponer</h3>
                      <ExportButton onClick={() => descargarExcel('stock_bajo', [{ label: 'SKU', value: 'sku' }, { label: 'Producto', value: 'nombre' }, { label: 'Stock', value: 'stock' }, { label: 'Mínimo', value: 'stock_minimo' }], d.bajo)} /></div>
                    {d.bajo.length === 0 ? <Empty text="Todo el stock está en orden" /> : (
                      <ul className="max-h-72 space-y-2 overflow-y-auto">
                        {d.bajo.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                            <span className="min-w-0"><p className="truncate font-medium">{p.nombre}</p><p className="text-[11px] text-white/40">{p.sku}</p></span>
                            <Badge tone={p.stock === 0 ? 'rose' : 'amber'}>{p.stock} / {p.stock_minimo}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </Card>
            </Reveal>
          </div>

          {vend && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal>
                <Card className="h-full p-5">
                  <h3 className="font-display mb-3 flex items-center gap-2 font-semibold"><HandCoins className="size-4 text-amber-300" /> Mis ventas por cobrar</h3>
                  {extra.cobrar.length === 0 ? <Empty text="No tienes saldos pendientes" /> : (
                    <ul className="max-h-64 space-y-2 overflow-y-auto">
                      {extra.cobrar.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                          <span className="min-w-0"><p className="truncate font-medium">{v.clientes?.nombre || 'Cliente varios'}</p><p className="text-[11px] text-white/40">{v.serie}-{String(v.numero).padStart(6, '0')}</p></span>
                          <b className="text-amber-300">{money(v.saldo)}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </Reveal>
              <Reveal delay={0.1}>
                <Card className="h-full p-5">
                  <div className="mb-3 flex items-center justify-between"><h3 className="font-display font-semibold">Mis últimas ventas</h3>
                    <ExportButton onClick={() => descargarExcel('mis_ventas', [
                      { label: 'Comprobante', value: (v) => `${v.serie}-${String(v.numero).padStart(6, '0')}` }, { label: 'Cliente', value: (v) => v.clientes?.nombre || 'Cliente varios' },
                      { label: 'Fecha', value: (v) => fmtDateTime(v.fecha) }, { label: 'Estado', value: 'estado' }, { label: 'Total', value: 'total' },
                    ], d.ventas)}>CSV (30 días)</ExportButton></div>
                  {d.ventas.length === 0 ? <Empty text="Aún no tienes ventas" /> : (
                    <ul className="space-y-2">
                      {d.ventas.slice(0, 6).map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                          <span className="min-w-0"><p className="truncate font-medium">{v.clientes?.nombre || 'Cliente varios'}</p><p className="text-[11px] text-white/40">{v.serie}-{String(v.numero).padStart(6, '0')}</p></span>
                          <span className="flex items-center gap-2"><Badge tone={ESTADO[v.estado]}>{v.estado}</Badge><b>{money(v.total)}</b></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </Reveal>
            </div>
          )}

          {!vend && (
            <Reveal>
              <Card className="p-5">
                <h3 className="font-display mb-3 font-semibold">Compras recientes</h3>
                {d.compras.length === 0 ? <Empty text="Aún no hay compras registradas" /> : (
                  <ul className="space-y-2">
                    {d.compras.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                        <span>#{c.id} · {c.proveedores?.razon_social || 'Sin proveedor'} <span className="text-white/40">· {c.fecha}</span></span>
                        <span className="flex items-center gap-2"><Badge tone={c.estado === 'ANULADA' ? 'rose' : 'emerald'}>{c.estado}</Badge><b>{money(c.total)}</b></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Reveal>
          )}
        </div>
      )}
    </>
  )
}