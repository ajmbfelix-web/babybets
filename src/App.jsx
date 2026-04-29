import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './lib/context'
import LandingPage from './pages/LandingPage'
import SetupPage   from './pages/SetupPage'
import HostPage    from './pages/HostPage'
import BetPage     from './pages/BetPage'
import PoolPage    from './pages/Leaderboard' // 1. Add this import
import AdminResolve from "./pages/AdminResolve";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                  element={<LandingPage />} />
          <Route path="/setup"             element={<SetupPage />} />
          <Route path="/pool/:slug"        element={<PoolPage />} /> {/* 2. Add this route */}
          <Route path="/pool/:slug/host"   element={<HostPage />} />
          <Route path="/bet/:slug"         element={<BetPage />} />
          <Route path="/admin/resolve/:slug" element={<AdminResolve />} />
          
          {/* Fallback */}
          <Route path="*" element={
            <div className="min-h-screen bg-cream-100 flex items-center justify-center">
              <div className="text-center">
                <p className="text-6xl mb-4">🍼</p>
                <h1 className="font-serif text-2xl text-sage-800 mb-2">Page not found</h1>
                <a href="/" className="text-sage-500 font-sans text-sm underline">Go home</a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}