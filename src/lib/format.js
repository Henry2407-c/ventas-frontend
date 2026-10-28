export const money = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(n || 0))
export const num = (n) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(Number(n || 0))
export const limaDate = (d = new Date()) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' })
export const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return limaDate(d)
}
export const monthStart = () => limaDate().slice(0, 8) + '01'
export const fmtHora = (d) =>
  new Date(d).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })