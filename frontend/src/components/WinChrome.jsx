// frontend/src/components/WinChrome.jsx
import React from 'react'

export default function WinChrome({ title, onClose, children, winId = 'win' }) {
  return (
    <div className="win-chrome" id={`${winId}-chrome`}>
      <div className="win-titlebar" id={`${winId}-titlebar`}>
        <div className="win-dots">
          <div className="win-dot red"    id={`${winId}-close-btn`} onClick={onClose} />
          <div className="win-dot yellow" id={`${winId}-minimise-btn`} />
          <div className="win-dot green"  id={`${winId}-maximise-btn`} />
        </div>
        <span className="win-title" id={`${winId}-title`}>{title}</span>
      </div>
      <div className="win-body" id={`${winId}-body`}>{children}</div>
    </div>
  )
}
