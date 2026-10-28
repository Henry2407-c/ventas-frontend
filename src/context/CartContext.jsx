import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext(null)
export const useCart = () => useContext(Ctx)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || [] } catch { return [] }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)) }, [items])

  const add = (p, qty = 1) =>
    setItems((prev) => {
      const found = prev.find((x) => x.id === p.id)
      if (found) {
        return prev.map((x) =>
          x.id === p.id ? { ...x, stock: p.stock, precio: p.precio, cantidad: Math.min(x.cantidad + qty, p.stock) } : x,
        )
      }
      return [...prev, {
        id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url,
        stock: p.stock, cantidad: Math.min(qty, p.stock),
      }]
    })
  const setQty = (id, q) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, cantidad: Math.max(1, Math.min(q, x.stock)) } : x)))
  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id))
  const clear = () => setItems([])
  const count = items.reduce((s, x) => s + x.cantidad, 0)
  const total = items.reduce((s, x) => s + x.cantidad * x.precio, 0)

  return (
    <Ctx.Provider value={{ items, open, setOpen, add, setQty, remove, clear, count, total }}>
      {children}
    </Ctx.Provider>
  )
}