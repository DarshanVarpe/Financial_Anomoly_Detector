// frontend/src/components/ToastContainer.jsx
import React from 'react'

const COLORS = {
  success:     'var(--success)',
  'error-toast': 'var(--error)',
  'warning-t': 'var(--warning)',
  info:        'var(--purple)',
}

export default function ToastContainer({ toasts }) {
  return (
    <div id="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast"
          style={{ borderLeftColor: COLORS[t.type] || 'var(--purple)' }}
        >
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
