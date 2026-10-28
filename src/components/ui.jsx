import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, CircuitBoard, Inbox, Loader2, X } from 'lucide-react'
import { num } from '../lib/format'

export const GRADS = ['grad-violet', 'grad-cyan', 'grad-emerald', 'grad-amber', 'grad-pink']

export function Reveal({ children, delay = 0, className = '', y = 24 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export const Card = ({ className = '', children, ...p }) => (
  <div className={`glass rounded-2xl ${className}`} {...p}>{children}</div>
)

const BTN = {
  primary: 'btn-glow text-white hover:brightness-110',
  ghost: 'bg-white/5 hover:bg-white/10 text-white border border-white/10',
  danger: 'bg-rose-500/90 hover:bg-rose-500 text-white',
  success: 'bg-emerald-500/90 hover:bg-emerald-500 text-white',
}
export function Button({ variant = 'primary', loading, className = '', children, ...p }) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

const field =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/10'
export const Input = ({ label, className = '', ...p }) => (
  <label className="block text-xs font-medium text-white/60">
    {label}
    <input {...p} className={`${field} ${label ? 'mt-1' : ''} ${className}`} />
  </label>
)
export const Select = ({ label, className = '', children, ...p }) => (
  <label className="block text-xs font-medium text-white/60">
    {label}
    <select {...p} className={`${field} ${label ? 'mt-1' : ''} [&>option]:bg-[#14163a] ${className}`}>{children}</select>
  </label>
)
export const Textarea = ({ label, className = '', ...p }) => (
  <label className="block text-xs font-medium text-white/60">
    {label}
    <textarea {...p} className={`${field} ${label ? 'mt-1' : ''} ${className}`} />
  </label>
)

const TONES = {
  slate: 'bg-white/10 text-white/70',
  violet: 'bg-violet-500/20 text-violet-200',
  cyan: 'bg-cyan-500/20 text-cyan-200',
  emerald: 'bg-emerald-500/20 text-emerald-200',
  amber: 'bg-amber-500/20 text-amber-200',
  rose: 'bg-rose-500/20 text-rose-200',
}
export const Badge = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}>
    {children}
  </span>
)

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101233] p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-bold">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function CountUp({ value, format = num }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, start
    const to = Number(value) || 0
    const step = (t) => {
      start ??= t
      const p = Math.min((t - start) / 900, 1)
      setV(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format(v)}</>
}

export function KpiCard({ icon: Icon, label, value, format, sub, delta, grad = 'grad-violet', delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div className="glass relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1">
        <div className={`${grad} absolute -right-6 -top-6 size-28 rounded-full opacity-30 blur-2xl`} />
        <div className={`${grad} mb-3 inline-flex size-11 items-center justify-center rounded-xl shadow-lg`}>
          <Icon className="size-5 text-white" />
        </div>
        <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
        <p className="font-display mt-1 text-2xl font-bold sm:text-3xl">
          <CountUp value={value} format={format} />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
          {delta !== undefined && delta !== null && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${delta >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      </div>
    </Reveal>
  )
}

export const Skeleton = ({ className = '' }) => <div className={`skeleton rounded-2xl ${className}`} />

export const Empty = ({ icon: Icon = Inbox, text }) => (
  <div className="flex flex-col items-center gap-3 py-12 text-white/40">
    <Icon className="size-10" />
    <p className="text-sm">{text}</p>
  </div>
)

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
      {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
    </div>
    {children}
  </div>
)

export function Thumb({ p, className = '' }) {
  const [bad, setBad] = useState(false)
  if (p.imagen_url && !bad) {
    return <img src={p.imagen_url} alt={p.nombre} loading="lazy" onError={() => setBad(true)} className={`object-cover ${className}`} />
  }
  return (
    <div className={`${GRADS[p.id % GRADS.length]} flex items-center justify-center ${className}`}>
      <CircuitBoard className="size-12 text-white/80" />
    </div>
  )
}