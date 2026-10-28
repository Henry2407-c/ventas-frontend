import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useCart } from '../context/CartContext'
import { Button, Input, Select, Textarea, Thumb } from './ui'

const INIT = { nombre: '', telefono: '', email: '', tipo_doc: '', numero_doc: '', entrega: 'RECOJO', direccion: '', notas: '' }
const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24']

function Confetti() {
  const parts = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      c: COLORS[i % 5], x: (Math.random() - 0.5) * 380, y: 120 + Math.random() * 240,
      r: Math.random() * 720, d: 1.4 + Math.random(),
    })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 flex justify-center">
      {parts.map((p, i) => (
        <motion.span key={i} className="absolute size-2.5 rounded-sm" style={{ background: p.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.r }}
          transition={{ duration: p.d, ease: 'easeOut' }} />
      ))}
    </div>
  )
}

export default function CartDrawer() {
  const { items, open, setOpen, setQty, remove, clear, total, count } = useCart()
  const [step, setStep] = useState('cart')
  const [f, setF] = useState(INIT)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const close = () => {
    setOpen(false)
    if (step === 'done') setTimeout(() => setStep('cart'), 300)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await api.post('/tienda/pedidos', {
        nombre: f.nombre.trim(),
        telefono: f.telefono.trim(),
        email: f.email.trim() || null,
        tipo_doc: f.tipo_doc || null,
        numero_doc: f.tipo_doc ? f.numero_doc.trim() : null,
        entrega: f.entrega,
        direccion: f.entrega === 'ENVIO' ? f.direccion.trim() : null,
        notas: f.notas.trim() || null,
        items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
      })
      setDone(r.pedido); clear(); setF(INIT); setStep('done')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-white/10 bg-[#0d0f2b] shadow-2xl sm:w-[440px]"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-2">
                {step === 'form' && (
                  <button onClick={() => setStep('cart')} className="rounded-lg p-1.5 hover:bg-white/10"><ArrowLeft className="size-5" /></button>
                )}
                <h2 className="font-display text-xl font-bold">
                  {step === 'cart' ? `Tu carrito (${count})` : step === 'form' ? 'Tus datos' : '¡Pedido enviado!'}
                </h2>
              </div>
              <button onClick={close} className="rounded-lg p-1.5 hover:bg-white/10"><X className="size-5" /></button>
            </div>

            {step === 'cart' && (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {items.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-20 text-white/40">
                      <ShoppingBag className="size-12" /><p>Tu carrito está vacío</p>
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {items.map((i) => (
                      <motion.div key={i.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -60, height: 0 }} className="glass flex gap-3 rounded-2xl p-3">
                        <Thumb p={i} className="size-16 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold">{i.nombre}</p>
                          <p className="text-sm text-cyan-300">{money(i.precio)}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex items-center rounded-lg bg-white/5">
                              <button className="p-1.5" onClick={() => setQty(i.id, i.cantidad - 1)}><Minus className="size-3.5" /></button>
                              <span className="w-7 text-center text-sm">{i.cantidad}</span>
                              <button className="p-1.5" onClick={() => setQty(i.id, i.cantidad + 1)}><Plus className="size-3.5" /></button>
                            </div>
                            <button onClick={() => remove(i.id)} className="ml-auto rounded-lg p-1.5 text-rose-300 hover:bg-rose-500/10"><Trash2 className="size-4" /></button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="space-y-3 border-t border-white/10 p-5">
                  <div className="flex items-end justify-between">
                    <span className="text-white/60">Total (IGV incluido)</span>
                    <span className="font-display text-gradient text-2xl font-bold">{money(total)}</span>
                  </div>
                  <Button className="w-full py-3" disabled={items.length === 0} onClick={() => setStep('form')}>Continuar con el pedido</Button>
                </div>
              </>
            )}

            {step === 'form' && (
              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  <Input label="Nombre completo *" required value={f.nombre} onChange={set('nombre')} />
                  <Input label="Teléfono / WhatsApp *" required inputMode="tel" value={f.telefono} onChange={set('telefono')} />
                  <Input label="Correo (opcional)" type="email" value={f.email} onChange={set('email')} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Documento (opcional)" value={f.tipo_doc} onChange={set('tipo_doc')}>
                      <option value="">Sin documento</option><option value="DNI">DNI</option><option value="RUC">RUC</option>
                    </Select>
                    <Input label="Número" disabled={!f.tipo_doc} inputMode="numeric" maxLength={f.tipo_doc === 'RUC' ? 11 : 8}
                      required={!!f.tipo_doc} value={f.numero_doc} onChange={set('numero_doc')} />
                  </div>
                  <Select label="Entrega" value={f.entrega} onChange={set('entrega')}>
                    <option value="RECOJO">Recojo en tienda</option><option value="ENVIO">Envío a domicilio</option>
                  </Select>
                  {f.entrega === 'ENVIO' && <Input label="Dirección de envío *" required value={f.direccion} onChange={set('direccion')} />}
                  <Textarea label="Notas (opcional)" rows={2} value={f.notas} onChange={set('notas')} />
                </div>
                <div className="space-y-3 border-t border-white/10 p-5">
                  <div className="flex justify-between text-sm"><span className="text-white/60">Total del pedido</span><span className="font-bold">{money(total)}</span></div>
                  <Button type="submit" loading={busy} className="w-full py-3">Enviar pedido</Button>
                  <p className="text-center text-[11px] text-white/40">Te contactaremos para confirmar tu pedido y el pago.</p>
                </div>
              </form>
            )}

            {step === 'done' && (
              <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <Confetti />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }}>
                  <CheckCircle2 className="size-20 text-emerald-400" />
                </motion.div>
                <h3 className="font-display text-2xl font-bold">¡Gracias por tu pedido!</h3>
                <p className="text-white/60">
                  Tu pedido <b className="text-white">#{done}</b> fue recibido. Te contactaremos pronto para confirmarlo.
                </p>
                <Button onClick={close} className="mt-2 px-8">Seguir comprando</Button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}