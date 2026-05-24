// frontend/src/components/Dock.jsx
import React, { useRef } from 'react'

const DOCK_ITEMS = [
  { id: 'desktop',      icon: '🏠', label: 'Desktop',          cls: 'di-c-desktop' },
  { id: 'dashboard',    icon: '⊞',  label: 'Dashboard',         cls: 'di-c-dash' },
  { separator: true },
  { id: 'transactions', icon: '↔',  label: 'Transactions',      cls: 'di-c-tx' },
  { id: 'reports',      icon: '📄', label: 'Reports',           cls: 'di-c-reports' },
  { id: 'model',        icon: '◈',  label: 'Model Performance', cls: 'di-c-model' },
  { id: 'threshold',    icon: '⚙',  label: 'Thresholds',        cls: 'di-c-thresh' },
  { id: 'description',  icon: '📋', label: 'Description',       cls: 'di-c-desc' },
]

export default function Dock({ currentPage, onNavigate, onOpenModal }) {
  const dockRef = useRef(null)

  function handleMouseEnter(e) {
    const items = [...dockRef.current.querySelectorAll('.dock-item')]
    const idx = items.indexOf(e.currentTarget)
    items.forEach((s, i) => {
      const dist = Math.abs(i - idx)
      const sc = dist === 0 ? 1 : dist === 1 ? 0.85 : 0.75
      const icon = s.querySelector('.dock-icon')
      if (icon) icon.style.transform = `scale(${sc})`
    })
  }

  function handleMouseLeave() {
    dockRef.current?.querySelectorAll('.dock-icon').forEach(ic => {
      ic.style.transform = ''
    })
  }

  return (
    <div id="dock" ref={dockRef}>
      {DOCK_ITEMS.map((item, idx) => {
        if (item.separator) return <div key={idx} className="dock-separator" />
        const isActive = !item.modal && currentPage === item.id
        return (
          <div
            key={item.id}
            className={`dock-item${isActive ? ' active' : ''}`}
            id={item.modal ? undefined : `dock-${item.id}`}
            onClick={() => item.modal ? onOpenModal(item.id) : onNavigate(item.id)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`dock-icon ${item.cls}`}>{item.icon}</div>
            <div className="dock-tooltip">{item.label}</div>
          </div>
        )
      })}
    </div>
  )
}
