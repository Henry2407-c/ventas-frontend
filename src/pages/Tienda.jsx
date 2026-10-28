import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronDown, CircuitBoard, Cpu, ExternalLink, LogIn, Mail, MapPin, MessageCircle, Minus, PackageX, Phone,
  Plus, Rocket, Search, ShieldCheck, ShoppingCart, Wifi, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api, qs } from '../lib/api'
import { money } from '../lib/format'
import { BRAND } from '../brand'
import { useCart } from '../context/CartContext'
import { Badge, Button, Modal, Skeleton } from '../components/ui'
import { Logo, ProductThumb } from '../components/extras'
import CartDrawer from '../components/CartDrawer'

const FEAT_ICONS = [[Zap, 'grad-cyan'], [ShieldCheck, 'grad-violet'], [Rocket, 'grad-pink']]
const wa = (t = '') => {
  const d = t.replace(/\D/g, '')
  return `https://wa.me/${d.length === 9 ? '51' + d : d}`
}

function StockBadge({ s }) {
  if (s <= 0) return <Badge tone="rose">Agotado</Badge>
  if (s <= 5) return <Badge tone="amber">¡Últimas {s}!</Badge>
  return <Badge tone="emerald">En stock</Badge>
}

function ProductCard({ p, i, onView }) {
  const { add } = useCart()
  const out = p.stock <= 0
  const specs = Object.entries(p.especificaciones || {}).slice(0, 3)
  return (
    <motion.article
      initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (i % 4) * 0.08 }} whileHover={{ y: -8 }}
      className="group glass relative overflow-hidden rounded-3xl"
    >
      <div className="pointer-events-none absolute inset-0 z-10 rounded-3xl opacity-0 transition group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(34,211,238,.5), 0 20px 60px -20px rgba(124,58,237,.6)' }} />
      <button onClick={() => onView(p)} className="relative block w-full overflow-hidden text-left">
        <ProductThumb p={p} className="h-44 w-full transition duration-500 group-hover:scale-110" />
        {p.marcas?.nombre && <div className="absolute left-3 top-3"><Badge tone="cyan">{p.marcas.nombre}</Badge></div>}
      </button>
      <div className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-white/40">{p.categorias?.nombre || 'Componentes'}</p>
        <h3 className="font-display mt-0.5 line-clamp-2 min-h-12 font-semibold leading-snug">{p.nombre}</h3>
        <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
          {specs.map(([k, v]) => <span key={k} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/60">{k}: {String(v)}</span>)}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="font-display text-gradient text-xl font-bold">{money(p.precio)}</p>
            <p className="text-[11px] text-white/40">IGV incluido</p>
          </div>
          <StockBadge s={p.stock} />
        </div>
        <Button className="mt-3 w-full" disabled={out} onClick={() => { add(p); toast.success('Agregado al carrito') }}>
          {out ? <><PackageX className="size-4" />Agotado</> : <><ShoppingCart className="size-4" />Agregar</>}
        </Button>
      </div>
    </motion.article>
  )
}

function QuickView({ p, onClose }) {
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  useEffect(() => { setQty(1) }, [p?.id])
  return (
    <Modal open={!!p} onClose={onClose} title={p?.nombre} wide>
      {p && (
        <div className="grid gap-5 sm:grid-cols-2">
          <ProductThumb p={p} className="min-h-56 w-full rounded-2xl" />
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {p.marcas?.nombre && <Badge tone="cyan">{p.marcas.nombre}</Badge>}
              {p.categorias?.nombre && <Badge tone="violet">{p.categorias.nombre}</Badge>}
              {p.numero_parte && <Badge>{p.numero_parte}</Badge>}
              <StockBadge s={p.stock} />
            </div>
            {p.descripcion && <p className="text-sm text-white/70">{p.descripcion}</p>}
            {Object.keys(p.especificaciones || {}).length > 0 && (
              <dl className="divide-y divide-white/10 rounded-xl border border-white/10 text-sm">
                {Object.entries(p.especificaciones).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 px-3 py-2"><dt className="capitalize text-white/50">{k}</dt><dd>{String(v)}</dd></div>
                ))}
              </dl>
            )}
            {p.datasheet_url && (
              <a href={p.datasheet_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:underline">
                <ExternalLink className="size-4" /> Ver datasheet
              </a>
            )}
            <p className="font-display text-gradient text-3xl font-bold">{money(p.precio)} <span className="text-xs font-normal text-white/40">IGV incluido</span></p>
            <div className="mt-auto flex items-center gap-3">
              <div className="glass flex items-center rounded-xl">
                <button className="p-2.5" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="size-4" /></button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button className="p-2.5" onClick={() => setQty((q) => Math.min(p.stock, q + 1))}><Plus className="size-4" /></button>
              </div>
              <Button className="flex-1" disabled={p.stock <= 0} onClick={() => { add(p, qty); toast.success('Agregado al carrito'); onClose() }}>
                <ShoppingCart className="size-4" /> Agregar al carrito
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Tienda() {
  const { count, setOpen } = useCart()
  const [empresa, setEmpresa] = useState(null)
  const [cats, setCats] = useState([])
  const [cat, setCat] = useState(null)
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [orden, setOrden] = useState('nombre')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState(null)
  const LIMIT = 12

  useEffect(() => {
    api.get('/tienda/empresa').then(setEmpresa).catch(() => {})
    api.get('/tienda/categorias').then(setCats).catch(() => {})
  }, [])
  useEffect(() => { const t = setTimeout(() => setQd(q), 350); return () => clearTimeout(t) }, [q])

  const load = async (offset = 0) => {
    setLoading(true); setError('')
    try {
      const rows = await api.get('/tienda/productos' + qs({ q: qd, categoria_id: cat, orden, limit: LIMIT, offset }))
      setItems((prev) => (offset ? [...prev, ...rows] : rows))
      setMore(rows.length === LIMIT)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load(0) }, [qd, cat, orden]) // eslint-disable-line

  const nombre = empresa?.nombre_comercial || 'Mi empresa'

  return (
    <div className="bg-aurora min-h-dvh">
      <header className="glass fixed inset-x-0 top-0 z-50 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <a href="#inicio" className="flex items-center gap-2.5">
            <Logo />
            <span><p className="font-display text-lg font-bold leading-none">{nombre}</p><p className="hidden text-[10px] text-cyan-200/70 sm:block">{BRAND.slogan}</p></span>
          </a>
          <div className="relative mx-2 hidden flex-1 md:block">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar Arduino, ESP32, sensores..."
              className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-cyan-400/60" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/ingresar" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-white/60 hover:text-white sm:flex"><LogIn className="size-4" /> Personal</Link>
            <button onClick={() => setOpen(true)} className="btn-glow relative rounded-xl p-2.5">
              <ShoppingCart className="size-5 text-white" />
              {count > 0 && (
                <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-pink-500 text-[10px] font-bold">{count}</motion.span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section id="inicio" className="relative overflow-hidden pb-16 pt-28 sm:pt-40">
        <div className="grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="animate-float grad-violet absolute -left-20 top-24 size-72 rounded-full opacity-30 blur-3xl" />
        <div className="animate-float grad-cyan absolute right-0 top-10 size-80 rounded-full opacity-25 blur-3xl" style={{ animationDelay: '-3s' }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <motion.span initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-cyan-200"><Zap className="size-3.5" /> {BRAND.heroBadge}</motion.span>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="font-display mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl">
              {BRAND.heroTitle[0]}<span className="text-gradient">{BRAND.heroTitle[1]}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="mt-5 max-w-xl text-base text-white/65 sm:text-lg">{BRAND.heroText}</motion.p>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-wrap gap-3">
              <a href="#catalogo"><Button className="px-6 py-3 text-base">Ver catálogo <ChevronDown className="size-4" /></Button></a>
              <Button variant="ghost" className="px-6 py-3 text-base" onClick={() => setOpen(true)}><ShoppingCart className="size-4" /> Mi carrito</Button>
            </motion.div>
          </div>
          <div className="relative mx-auto h-80 w-full max-w-md sm:h-96">
            {[
              { icon: Cpu, t: 'Arduino y Raspberry Pi', s: 'Placas de desarrollo', g: 'grad-violet', pos: 'left-0 top-4' },
              { icon: Wifi, t: 'ESP32 y módulos IoT', s: 'Wi-Fi, Bluetooth, LoRa', g: 'grad-cyan', pos: 'right-0 top-24' },
              { icon: CircuitBoard, t: 'Sensores y componentes', s: 'Todo para tu proyecto', g: 'grad-pink', pos: 'left-10 bottom-0' },
            ].map((c, i) => (
              <motion.div key={c.t} animate={{ y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 4 + i, ease: 'easeInOut' }}
                className={`glass absolute ${c.pos} flex items-center gap-3 rounded-2xl p-4 shadow-2xl`}>
                <span className={`${c.g} grid size-12 place-items-center rounded-xl`}><c.icon className="size-6 text-white" /></span>
                <span><p className="font-display font-semibold">{c.t}</p><p className="text-xs text-white/50">{c.s}</p></span>
              </motion.div>
            ))}
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 24, ease: 'linear' }} className="absolute inset-8 -z-10 rounded-full border border-dashed border-white/15" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-14 sm:grid-cols-3">
        {BRAND.features.map((f, i) => {
          const [Icon, g] = FEAT_ICONS[i % 3]
          return (
            <motion.div key={f.t} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.12 }} className="glass flex items-center gap-4 rounded-2xl p-5">
              <span className={`${g} grid size-12 shrink-0 place-items-center rounded-xl`}><Icon className="size-6 text-white" /></span>
              <span><p className="font-display font-semibold">{f.t}</p><p className="text-sm text-white/55">{f.d}</p></span>
            </motion.div>
          )
        })}
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">{BRAND.catalogTitle}</h2>
            <p className="text-white/50">{BRAND.catalogText}</p>
          </div>
          <select value={orden} onChange={(e) => setOrden(e.target.value)} className="glass rounded-xl px-3 py-2.5 text-sm outline-none [&>option]:bg-[#14163a]">
            <option value="nombre">Orden: A-Z</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
        </div>

        <div className="relative mb-4 md:hidden">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar productos..."
            className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-cyan-400/60" />
        </div>

        <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2">
          {[{ id: null, nombre: 'Todos' }, ...cats].map((c, i) => (
            <motion.button key={c.id ?? 'all'} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition ${cat === c.id ? 'btn-glow text-white' : 'glass text-white/70 hover:text-white'}`}>{c.nombre}</motion.button>
          ))}
        </div>

        {error && <p className="glass rounded-2xl p-6 text-center text-rose-300">{error}</p>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading && items.length === 0
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-96" />)
            : items.map((p, i) => <ProductCard key={p.id} p={p} i={i} onView={setView} />)}
        </div>
        {!loading && !error && items.length === 0 && (
          <div className="glass mt-6 rounded-3xl py-16 text-center text-white/50"><PackageX className="mx-auto mb-3 size-10" />No encontramos productos con esa búsqueda.</div>
        )}
        {more && <div className="mt-8 text-center"><Button variant="ghost" loading={loading} onClick={() => load(items.length)} className="px-8">Ver más productos</Button></div>}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <h2 className="font-display mb-8 text-center text-3xl font-bold">{BRAND.stepsTitle}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {BRAND.steps.map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="glass relative overflow-hidden rounded-3xl p-6">
              <span className="font-display text-gradient absolute -right-2 -top-4 text-8xl font-bold opacity-30">{i + 1}</span>
              <span className="grad-brand mb-4 grid size-11 place-items-center rounded-xl font-display text-lg font-bold">{i + 1}</span>
              <h3 className="font-display text-xl font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-white/60">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5"><Logo /><p className="font-display text-lg font-bold">{nombre}</p></div>
            <p className="mt-2 text-sm text-cyan-200/70">{BRAND.slogan}</p>
            {empresa?.razon_social && <p className="mt-1 text-xs text-white/40">{empresa.razon_social} · RUC {empresa.ruc}</p>}
          </div>
          <div className="space-y-2 text-sm text-white/60">
            {empresa?.direccion && <p className="flex gap-2"><MapPin className="size-4 shrink-0" />{empresa.direccion}{empresa.distrito ? `, ${empresa.distrito}` : ''}</p>}
            {empresa?.telefono && <p className="flex gap-2"><Phone className="size-4 shrink-0" />{empresa.telefono}</p>}
            {empresa?.email && <p className="flex gap-2"><Mail className="size-4 shrink-0" />{empresa.email}</p>}
          </div>
          <div className="text-sm text-white/40 sm:text-right"><Link to="/ingresar" className="hover:text-white">Acceso del personal</Link></div>
        </div>
      </footer>

      {empresa?.telefono && (
        <a href={wa(empresa.telefono)} target="_blank" rel="noreferrer" aria-label="WhatsApp"
          className="fixed bottom-5 left-5 z-40 grid size-14 place-items-center rounded-full bg-emerald-500 shadow-2xl shadow-emerald-500/40 transition hover:scale-110">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
          <MessageCircle className="relative size-7 text-white" />
        </a>
      )}

      <QuickView p={view} onClose={() => setView(null)} />
      <CartDrawer />
    </div>
  )
}