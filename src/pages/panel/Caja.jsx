import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Banknote, CreditCard, Landmark, Receipt, Smartphone, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { api, qs } from '../../lib/api'
import { fmtHora, limaDate, money } from '../../lib/format'
import { descargarLibro } from '../../lib/excel'
import { useAuth } from '../../context/AuthContext'
import { Badge, Card, Empty, Input, KpiCard, PageHeader, Reveal, Skeleton } from '../../components/ui'
import { ExportButton } from '../../components/extras'

const META = {
  EFECTIVO: { icon: Banknote, color: '#34d399', label: 'Efectivo' },
  TARJETA: { icon: CreditCard, color: '#60a5fa', label: 'Tarjeta' },
  YAPE: { icon: Smartphone, color: '#a78bfa', label: 'Yape' },
  PLIN: { icon: Smartphone, color: '#22d3ee', label: 'Plin' },
  TRANSFERENCIA: { icon: Landmark, color: '#fbbf24', label: 'Transferencia' },
}
const tip = {
  contentStyle: { background: '#14163a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#fff' },
  itemStyle: { color: '#fff' },
}

export default function Caja() {
  const { user } = useAuth()
  const [fecha, setFecha] = useState(limaDate())
  const [d, setD] = useState(null)

  useEffect(() => {
    setD(null)
    api.get('/reportes/caja' + qs({ fecha })).then(setD)
      .catch((e) => { toast.error(e.message); setD({ total: 0, cantidad: 0, por_metodo: [], detalle: [] }) })
  }, [fecha])

  const efectivo = d?.por_metodo.find((m) => m.metodo === 'EFECTIVO')?.total || 0
  const digital = (d?.total || 0) - efectivo
  const propia = user.rol === 'vendedor'

  const exportar = () => descargarLibro(`caja_${fecha}`, [
    {
      hoja: 'Resumen', titulo: 'Cierre de caja', subtitulo: `Fecha ${fecha}${propia ? ' · ' + (user.nombre || '') : ''}`,
      columnas: [
        { label: 'Método de pago', value: (m) => META[m.metodo]?.label || m.metodo },
        { label: 'Pagos', value: 'cantidad', fmt: 'int' },
        { label: 'Total', value: 'total' },
      ],
      filas: d.por_metodo, totales: ['Pagos', 'Total'],
    },
    {
      hoja: 'Detalle', titulo: 'Detalle de cobros', subtitulo: `Fecha ${fecha}`,
      columnas: [
        { label: 'Hora', value: (x) => fmtHora(x.hora) }, { label: 'Comprobante', value: 'comprobante' },
        { label: 'Cliente', value: 'cliente' }, { label: 'Vendedor', value: 'vendedor' },
        { label: 'Método', value: (x) => META[x.metodo]?.label || x.metodo }, { label: 'Referencia', value: (x) => x.referencia || '' },
        { label: 'Monto', value: 'monto' },
      ],
      filas: d.detalle, totales: ['Monto'],
    },
  ])

  return (
    <>
      <PageHeader title="Caja del día" subtitle={propia ? 'Tus cobros del día' : 'Cobros del día por método de pago'}>
        <div className="flex items-end gap-2">
          <Input label="Fecha" type="date" value={fecha} max={limaDate()} onChange={(e) => setFecha(e.target.value)} />
          <div className="pb-0.5"><ExportButton onClick={() => d && exportar()} /></div>
        </div>
      </PageHeader>

      {!d ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard icon={Wallet} label="Total cobrado" value={d.total} format={money} grad="grad-violet" sub={`${d.cantidad} pagos`} />
            <KpiCard icon={Banknote} label="Efectivo en caja" value={efectivo} format={money} grad="grad-emerald" delay={0.07} sub="Lo que debe haber en la gaveta" />
            <KpiCard icon={Smartphone} label="Pagos digitales" value={digital} format={money} grad="grad-cyan" delay={0.14} sub="Tarjeta, Yape, Plin, transferencia" />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <Reveal className="lg:col-span-3">
              <Card className="h-full p-5">
                <h3 className="font-display mb-4 font-semibold">Por método de pago</h3>
                {d.por_metodo.length === 0 ? <Empty icon={Receipt} text="No hay cobros registrados este día" /> : (
                  <ul className="space-y-4">
                    {d.por_metodo.map((m) => {
                      const x = META[m.metodo] || { icon: Wallet, color: '#94a3b8', label: m.metodo }
                      const pct = d.total ? (m.total / d.total) * 100 : 0
                      return (
                        <li key={m.metodo}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium"><x.icon className="size-4" style={{ color: x.color }} />{x.label}<span className="text-xs text-white/40">{m.cantidad} pagos</span></span>
                            <b>{money(m.total)}</b>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                            <motion.div className="h-full rounded-full" style={{ background: x.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-2">
              <Card className="h-full p-5">
                <h3 className="font-display mb-2 font-semibold">Distribución</h3>
                {d.total === 0 ? <Empty text="Sin datos" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={d.por_metodo} dataKey="total" nameKey="metodo" innerRadius={55} outerRadius={90} paddingAngle={4} stroke="none">
                        {d.por_metodo.map((m) => <Cell key={m.metodo} fill={META[m.metodo]?.color || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip {...tip} formatter={(v) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Reveal>
          </div>

          <Reveal>
            <Card className="p-5">
              <h3 className="font-display mb-3 font-semibold">Detalle de cobros</h3>
              {d.detalle.length === 0 ? <Empty text="Sin cobros" /> : (
                <>
                  <ul className="space-y-2 sm:hidden">
                    {d.detalle.map((x, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                        <span className="min-w-0"><p className="truncate font-medium">{x.cliente}</p><p className="text-[11px] text-white/40">{fmtHora(x.hora)} · {x.comprobante} · {META[x.metodo]?.label || x.metodo}</p></span>
                        <b>{money(x.monto)}</b>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="text-xs uppercase text-white/40"><tr><th className="pb-2">Hora</th><th className="pb-2">Comprobante</th><th className="pb-2">Cliente</th>{!propia && <th className="pb-2">Vendedor</th>}<th className="pb-2">Método</th><th className="pb-2 text-right">Monto</th></tr></thead>
                      <tbody className="divide-y divide-white/5">
                        {d.detalle.map((x, i) => (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="py-2.5 text-white/50">{fmtHora(x.hora)}</td><td className="py-2.5 font-medium">{x.comprobante}</td>
                            <td className="py-2.5 text-white/70">{x.cliente}</td>{!propia && <td className="py-2.5 text-white/60">{x.vendedor || '-'}</td>}
                            <td className="py-2.5"><Badge tone="violet">{META[x.metodo]?.label || x.metodo}</Badge>{x.referencia && <span className="ml-2 text-[11px] text-white/40">{x.referencia}</span>}</td>
                            <td className="py-2.5 text-right font-semibold">{money(x.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </Reveal>
        </div>
      )}
    </>
  )
}