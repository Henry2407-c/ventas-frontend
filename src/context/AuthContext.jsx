import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, clearSession, saveSession } from '../lib/api'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setUser(null)
      setReady(true)
      return
    }
    api.get('/usuarios/me')
      .then((u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)) })
      .catch(() => { clearSession(); setUser(null) })
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    saveSession(data)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => { clearSession(); setUser(null) }, [])
  const can = (...roles) => !!user && roles.includes(user.rol)

  return <Ctx.Provider value={{ user, ready, login, logout, can }}>{children}</Ctx.Provider>
}