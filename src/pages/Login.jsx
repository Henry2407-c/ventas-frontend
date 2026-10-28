import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Lock, Mail, MapPin, Phone } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { BRAND } from '../brand'
import { Button } from '../components/ui'
import { Logo } from '../components/extras'

const TRACES = [
  'M20 80 H120 V160 H240 V240 H380',
  'M20 200 H80 V320 H200 V400 H380',
  'M380 60 H300 V140 H180 V220 H60 V300 H20',
  'M100 480 V400 H160 V340 H300 V280 H380',
  'M200 20 V100 H260 V180 H340',
]
const NODES = [[120, 160], [240, 240], [80, 320], [200, 400], [180, 220], [300, 140], [160, 340], [300, 280]]

function Circuit() {
  return (
    <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full opacity-70" fill="none" preserveAspectRatio="xMidYMid slice">
      {TRACES.map((d, i) => (
        <g key={i}>
          <path d={d} stroke="rgba(255,255,255,.10)" strokeWidth="2" />
          <motion.path d={d} stroke={i % 2 ? '#22d3ee' : '#a78bfa'} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 26"
            animate={{ strokeDashoffset: [0, -68] }} transition={{ repeat: Infinity, duration: 2 + i * 0.4, ease: 'linear' }} />
        </g>
      ))}
      {NODES.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r="5" fill="#f472b6" animate={{ opacity: [0.3, 1, 0.3], r: [4, 7, 4] }}
          transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.3 }} />
      ))}
    </svg>
  )
}

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const [empresa, setEmpresa] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [fr, setFr] = useState(0)

  useEffect(() => { api.get('/tienda/empresa').then(setEmpresa).catch(() => {}) }, [])
  useEffect(() => { if (user) nav('/panel', { replace: true }) }, [user, nav])
  useEffect(() => {
    const t = setInterval(() => setFr((x) => (x + 1) % BRAND.loginPhrases.length), 2800)
    return () => clearInterval(t)
  }, [])

  const nombre = empresa?.nombre_comercial || 'Mi empresa'

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { await login(email, password); nav('/panel') } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  return (
    <div className="bg-aurora grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-bg absolute inset-0" />
        <Circuit />
        <div className="animate-float grad-violet absolute left-10 top-20 size-72 rounded-full opacity-30 blur-3xl" />
        <div className="animate-float grad-cyan absolute bottom-10 right-0 size-80 rounded-full opacity-25 blur-3xl" style={{ animationDelay: '-3s' }} />
        <Link to="/" className="relative flex w-fit items-center gap-2 text-white/70 hover:text-white"><ArrowLeft className="size-4" /> Volver a la tienda</Link>

        <div className="relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Logo big />
            <p className="font-display mt-5 text-2xl font-bold">{nombre}</p>
            <p className="text-sm text-cyan-200/80">{BRAND.slogan}</p>
            <h1 className="font-display mt-8 max-w-lg text-5xl font-bold leading-[1.05]">
              {BRAND.loginTitle[0]}<span className="text-gradient">{BRAND.loginTitle[1]}</span>
            </h1>
            <p className="mt-4 max-w-md text-white/60">{BRAND.loginText}</p>
            <div className="glass mt-8 inline-flex h-12 min-w-72 items-center rounded-full px-5">
              <span className="mr-3 size-2.5 animate-pulse rounded-full bg-emerald-400" />
              <AnimatePresence mode="wait">
                <motion.span key={fr} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-sm text-white/80">
                  {BRAND.loginPhrases[fr]}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <div className="relative space-y-1 text-xs text-white/40">
          {empresa?.razon_social && <p>{empresa.razon_social} · RUC {empresa.ruc}</p>}
          {empresa?.direccion && <p className="flex items-center gap-1.5"><MapPin className="size-3" />{empresa.direccion}</p>}
          {empresa?.telefono && <p className="flex items-center gap-1.5"><Phone className="size-3" />{empresa.telefono}</p>}
        </div>
      </div>

      <div className="flex items-center justify-center p-5">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          className="glass w-full max-w-md space-y-5 rounded-3xl p-7 shadow-2xl sm:p-9">
          <div className="flex items-center gap-3 lg:hidden"><Logo /><div><p className="font-display font-bold leading-none">{nombre}</p><p className="text-[11px] text-cyan-200/70">{BRAND.slogan}</p></div></div>
          <div>
            <h2 className="font-display text-3xl font-bold">Ingreso del personal</h2>
            <p className="text-sm text-white/50">Accede al panel de {nombre}</p>
          </div>
          <label className="block text-xs font-medium text-white/60">Correo
            <div className="relative mt-1">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm outline-none focus:border-cyan-400/60" />
            </div>
          </label>
          <label className="block text-xs font-medium text-white/60">Contraseña
            <div className="relative mt-1">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm outline-none focus:border-cyan-400/60" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          {err && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">{err}</motion.p>}
          <Button type="submit" loading={busy} className="w-full py-3">Ingresar</Button>
          <Link to="/" className="block text-center text-sm text-white/50 hover:text-white lg:hidden">Volver a la tienda</Link>
        </motion.form>
      </div>
    </div>
  )
}