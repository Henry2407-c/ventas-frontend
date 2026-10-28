import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  BatteryCharging, Cable, CircuitBoard, Cog, Cpu, FileSpreadsheet, Gauge, Lightbulb, Loader2, Monitor, Package,
  Radio, Thermometer, Wrench, Zap,
} from 'lucide-react'
import { GRADS } from './ui'

const ICONS = [
  [/micro/i, Cpu], [/sensor/i, Thermometer], [/m[oó]dulo|comunic/i, Radio], [/resist|capac/i, Gauge],
  [/semicond/i, CircuitBoard], [/pantalla|display/i, Monitor], [/motor|driver/i, Cog],
  [/energ|bater/i, BatteryCharging], [/herram/i, Wrench], [/cable|proto/i, Cable], [/led/i, Lightbulb],
]
export const iconFor = (nombre = '') => (ICONS.find(([re]) => re.test(nombre)) || [null, Package])[1]

export const Logo = ({ big = false }) => (
  <span className={`grad-brand grid shrink-0 place-items-center rounded-xl shadow-lg ${big ? 'size-16 rounded-2xl' : 'size-10'}`}>
    <Zap className={`${big ? 'size-8' : 'size-5'} text-white`} />
  </span>
)

export function ProductThumb({ p, className = '' }) {
  const [bad, setBad] = useState(false)
  if (p.imagen_url && !bad) {
    return <img src={p.imagen_url} alt={p.nombre} loading="lazy" onError={() => setBad(true)} className={`object-cover ${className}`} />
  }
  const Icon = iconFor(p.categorias?.nombre)
  return (
    <div className={`${GRADS[p.id % GRADS.length]} relative flex items-center justify-center overflow-hidden ${className}`}>
      <div className="grid-bg absolute inset-0 opacity-60" />
      <Icon className="relative size-14 text-white/90 drop-shadow-lg" />
    </div>
  )
}

export function QuickActions({ items }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((a, i) => (
        <motion.div key={a.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Link to={a.to} className="glass group flex items-center gap-3 rounded-2xl p-3.5 transition hover:-translate-y-1 hover:border-cyan-400/40">
            <span className={`${a.grad} grid size-10 shrink-0 place-items-center rounded-xl shadow-lg transition group-hover:scale-110`}>
              <a.icon className="size-5 text-white" />
            </span>
            <span className="text-sm font-semibold leading-tight">{a.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

export function ExportButton({ onClick, label = 'Excel' }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try { await onClick?.() } catch (e) { console.error(e); toast.error('No se pudo generar el archivo de Excel') } finally { setBusy(false) }
  }
  return (
    <button onClick={run} disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-60">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}{label}
    </button>
  )
}