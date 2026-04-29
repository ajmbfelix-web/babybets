import { createContext, useContext, useState, useCallback } from 'react'
import { getPool, getBetsForPool } from './supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [pool, setPool]       = useState(null)
  const [bets, setBets]       = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const loadPool = useCallback(async (slug) => {
    setLoading(true)
    setError(null)
    try {
      const p = await getPool(slug)
      setPool(p)
      const b = await getBetsForPool(p.id)
      setBets(b)
      return p
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshBets = useCallback(async () => {
    if (!pool) return
    const b = await getBetsForPool(pool.id)
    setBets(b)
  }, [pool])

  return (
    <AppContext.Provider value={{ pool, setPool, bets, setBets, loading, error, loadPool, refreshBets }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
