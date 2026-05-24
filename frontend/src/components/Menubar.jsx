// frontend/src/components/Menubar.jsx
import React, { useState, useEffect } from 'react'

export default function Menubar({ theme, onToggleTheme }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return (
    <div id="menubar">
      <div className="menubar-left" id="menubar-left">
        <div className="menubar-logo-dot" id="menubar-logo">C</div>
        <span className="menubar-app-name" id="menubar-app-name">FraudOS</span>
        <span className="menubar-tag" id="menubar-tag">boi.ai</span>
      </div>
      <div className="menubar-right" id="menubar-right">
        <div id="themeToggleBtn" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
          <span id="themeIcon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        </div>
        <span className="menubar-item" id="menubar-notification-btn">🔔</span>
        <span className="menubar-item" id="menubar-live-status">● LIVE</span>
        <span className="menubar-item" id="menubar-user-name">Sarah Chen</span>
        <div className="menubar-avatar" id="menubar-avatar">SC</div>
        <span id="clock">{time}</span>
      </div>
    </div>
  )
}
