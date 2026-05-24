// frontend/src/pages/DesktopPage.jsx
import React from 'react'

const DESKTOP_ITEMS = [
  { modal: 'notes',    icon: '📝', label: 'Notes',    tip: 'Investigation Notes', cls: 'di-notes', itemId: 'desktop-notes-icon'    },
  { modal: 'calendar', icon: '📅', label: 'Calendar', tip: 'Case Calendar',       cls: 'di-cal',   itemId: 'desktop-calendar-icon' },
]

export default function DesktopPage({ onOpenModal }) {
  return (
    <div className="page active" id="page-desktop">
      <div className="desktop-grid" id="desktop-grid">
        {DESKTOP_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className="desktop-icon"
            id={item.itemId}
            onClick={() => onOpenModal(item.modal)}
          >
            <div className={`di-icon ${item.cls}`}>{item.icon}</div>
            <span className="di-label">{item.label}</span>
            <span className="di-tooltip">{item.tip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
