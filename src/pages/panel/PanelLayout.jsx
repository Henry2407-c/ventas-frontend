import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Store } from 'lucide-react'
import { api, qs } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { NAV } from '../../nav'
import { Badge } from '../../components/ui'
import { Logo } from '../../components/extras'

const TONE = { admin: 'rose', vendedor: 'cyan', almacenero: 'amber', contador: 'emerald' }

function Side({ items, user, onLogout, nombre, badges }) {
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/panel" className="flex items-center gap-3">
        <Logo />
        <span className="min-w-0"><p className="font-display truncate font-bold leading-none">{nombre}</p><p className="text-[11px] text-white/50">Panel de gestión</p></span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${isActive ? 'grad-brand text-white shadow-lg' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
            <n.icon className="size-[18px]" />{n.label}
            {badges[n.to] > 0 && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-pink-500 px-1.5 text-[10px] font-bold text-white">{badges[n.to]}</span>}
          </NavLink>
        ))}
      </nav>
      <Link to="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white"><Store className="size-[18px]" /> Ver tienda</Link>
      <div className="glass rounded-2xl p-3">
        <p className="truncate text-sm font-semibold">{user.nombre || user.email}</p>
        <div className="mt-1 flex items-center justify-between">
          <Badge tone={TONE[user.rol]}>{user.rol}</Badge>
          <button onClick={onLogout} className="flex items-center gap-1 text-xs text-white/50 hover:text-white"><LogOut className="size-3.5" /> Salir</button>
        </div>
      </div>
    </div>
  )
}

function BottomNav({ items, badges }) {
  const ref = useRef(null)
  const { pathname } = useLocation()
  useEffect(() => {
    ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [pathname])

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="rounded-[28px] border border-white/10 bg-[#0d0f2b]/90 shadow-[0_-10px_40px_rgba(0,0,0,.5)] backdrop-blur-xl">
        <div ref={ref}
          className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto px-2 py-2 [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%_-_14px),transparent)]">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="w-[72px] shrink-0 snap-center">
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-1 py-1">
                  <span className="relative grid size-10 place-items-center">
                    {isActive && (
                      <motion.span layoutId="tabpill" className="grad-brand absolute inset-0 rounded-2xl shadow-lg"
                        transition={{ type: 'spring', damping: 24, stiffness: 320 }} />
                    )}
                    <n.icon className={`relative size-[22px] transition ${isActive ? 'text-white' : 'text-white/50'}`} />
                    {badges[n.to] > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-pink-500 px-1 text-[9px] font-bold text-white">{badges[n.to]}</span>
                    )}
                  </span>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/45'}`}>{n.short || n.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default function PanelLayout() {
  const { user, logout } = useAuth()
  const [sheet, setSheet] = useState(false)
  const [nombre, setNombre] = useState('Panel')
  const [nuevos, setNuevos] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => { setSheet(false) }, [pathname])
  useEffect(() => { api.get('/tienda/empresa').then((e) => setNombre(e.nombre_comercial)).catch(() => {}) }, [])
  useEffect(() => {
    if (!['admin', 'vendedor'].includes(user.rol)) return
    const f = () => api.get('/pedidos' + qs({ estado: 'NUEVO', limit: 50 })).then((r) => setNuevos(r.length)).catch(() => {})
    f()
    const t = setInterval(f, 60000)
    return () => clearInterval(t)
  }, [user.rol, pathname])

  const items = NAV.filter((n) => n.roles.includes(user.rol))
  const badges = { '/panel/pedidos': nuevos }
  const titulo = items.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label || 'Panel'

  return (
    <div className="bg-aurora min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-[#0a0b24]/80 backdrop-blur-xl lg:block">
        <Side items={items} user={user} onLogout={logout} nombre={nombre} badges={badges} />
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070816]/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-lg font-bold leading-tight">{titulo}</p>
            <p className="truncate text-[11px] text-white/45">{nombre}</p>
          </div>
          <button onClick={() => setSheet(true)} className="grad-brand font-display grid size-10 place-items-center rounded-full text-lg font-bold shadow-lg">
            {(user.nombre || user.email || '?')[0].toUpperCase()}
          </button>
        </div>
      </header>

      <BottomNav items={items} badges={badges} />

      <AnimatePresence>
        {sheet && (
          <motion.div className="fixed inset-0 z-[55] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setSheet(false)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-[#101233] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, i) => i.offset.y > 80 && setSheet(false)}
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
              <p className="font-display text-lg font-bold">{user.nombre || user.email}</p>
              <div className="mb-4 mt-1 flex items-center gap-2"><Badge tone={TONE[user.rol]}>{user.rol}</Badge><span className="truncate text-xs text-white/40">{user.email}</span></div>
              <Link to="/" className="mb-2 flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3.5 text-sm font-medium"><Store className="size-5" /> Ver tienda</Link>
              <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl bg-rose-500/15 px-4 py-3.5 text-sm font-medium text-rose-200"><LogOut className="size-5" /> Cerrar sesión</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="lg:pl-64">
        <motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl p-4 pb-32 sm:p-6 sm:pb-32 lg:p-8 lg:pb-8">
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}