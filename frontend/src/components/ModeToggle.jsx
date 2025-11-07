import { useState, useEffect } from 'react'
import axios from 'axios'

function ModeToggle({ mode, setMode }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch current mode on mount
    fetchCurrentMode()
  }, [])

  const fetchCurrentMode = async () => {
    try {
      const response = await axios.get('/api/config')
      setMode(response.data.mode)
    } catch (err) {
      console.error('Error fetching mode:', err)
    }
  }

  const toggleMode = async () => {
    const newMode = mode === 'test' ? 'prod' : 'test'
    setLoading(true)
    setError(null)

    try {
      await axios.post('/api/config/mode', { mode: newMode })
      setMode(newMode)
    } catch (err) {
      setError('Failed to toggle mode')
      console.error('Error toggling mode:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mode-toggle">
      <label className="toggle-label">
        <span className="mode-text">API Mode: </span>
        <button
          className={`toggle-button ${mode === 'prod' ? 'prod-mode' : 'test-mode'}`}
          onClick={toggleMode}
          disabled={loading}
        >
          {loading ? 'Switching...' : mode === 'test' ? 'TEST' : 'PRODUCTION'}
        </button>
      </label>
      {error && <div className="error-message">{error}</div>}
    </div>
  )
}

export default ModeToggle

