import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import SectorDetail from './components/SectorDetail'
import MyPage from './components/MyPage'
import Favorites from './components/Favorites'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user)
        setLoading(false)
      }, (error) => {
        console.error('Auth state change error:', error)
        setError('인증 초기화 중 오류가 발생했습니다.')
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err) {
      console.error('Firebase auth initialization error:', err)
      setError('Firebase 초기화 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }, [])

  if (error) {
    return (
      <div className="loading-container">
        <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          새로고침
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/sector/:sectorId" element={<SectorDetail />} />
        <Route path="/mypage" element={<MyPage />} />
      </Routes>
    </Router>
  )
}

export default App
