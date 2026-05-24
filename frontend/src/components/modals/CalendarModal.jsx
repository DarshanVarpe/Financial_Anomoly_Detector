// frontend/src/components/modals/CalendarModal.jsx
import React, { useState, useEffect } from 'react'

function calKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

export default function CalendarModal({ open, onClose, toast }) {
  const [month,    setMonth]    = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [events,   setEvents]   = useState({})
  const [input,    setInput]    = useState('')

  useEffect(() => { setEvents(JSON.parse(localStorage.getItem('fraudos-cal-events') || '{}')) }, [])

  function nav(dir) { setMonth(m => new Date(m.getFullYear(), m.getMonth() + dir, 1)) }

  function addEvent() {
    if (!input.trim()) return
    const key = calKey(selected)
    const updated = { ...events, [key]: [...(events[key] || []), { text: input.trim(), time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }] }
    setEvents(updated); localStorage.setItem('fraudos-cal-events', JSON.stringify(updated)); setInput('')
    if (toast) toast('Event added', 'success')
  }

  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const last  = new Date(month.getFullYear(), month.getMonth()+1, 0)
  const today = new Date(); const selKey = calKey(selected); const selEvts = events[selKey] || []
  const days = []
  for (let i = 0; i < first.getDay(); i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(month.getFullYear(), month.getMonth(), d))

  if (!open) return null
  return (
    <div id="calendar-modal" className="modal-overlay cal-modal" onClick={e => e.target===e.currentTarget && onClose()}>
      <div id="calendar-modal-box" className="modal-box">
        <div className="modal-titlebar">
          <span className="modal-title-text">📅 Case Calendar</span>
          <button id="calendar-close-btn" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="cal-header" id="calendar-header">
            <button id="calendar-prev-btn" className="cal-nav" onClick={() => nav(-1)}>‹</button>
            <span id="calendar-month-label" className="cal-month">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
            <button id="calendar-next-btn" className="cal-nav" onClick={() => nav(1)}>›</button>
          </div>
          <div id="calendar-grid" className="cal-grid">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
            {days.map((dt, i) => {
              if (!dt) return <div key={i} />
              const key = calKey(dt); const isToday = key===calKey(today); const isSel = key===selKey
              const hasEvt = events[key]?.length > 0
              let cls = 'cal-day'; if (isToday) cls+=' today'; else if(isSel) cls+=' selected'; if(hasEvt) cls+=' has-event'
              return <div key={i} id={`calendar-day-${key}`} className={cls} onClick={() => setSelected(dt)}>{dt.getDate()}</div>
            })}
          </div>
          <div id="calendar-events-section" className="cal-events">
            <div className="cal-events-title">Events — {selected.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
            <div id="calendar-events-list">{selEvts.length===0 ? <div style={{fontSize:11,color:'var(--text-muted)',padding:'6px 0'}}>No events for this day</div>
              : selEvts.map((e,i)=><div key={i} id={`calendar-event-item-${i}`} className="cal-event-item">{e.text}<div className="cal-event-time">{e.time}</div></div>)}
            </div>
            <div className="cal-add-row" id="calendar-add-row">
              <input id="calendar-event-input" className="cal-add-input" placeholder="Add event for selected date…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEvent()} />
              <button id="calendar-add-btn" className="btn btn-primary" onClick={addEvent}>Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
