// frontend/src/components/modals/NotesModal.jsx
import React, { useState, useEffect } from 'react'

export default function NotesModal({ open, onClose, toast }) {
  const [text,  setText]  = useState('')
  const [notes, setNotes] = useState([])

  useEffect(() => {
    setNotes(JSON.parse(localStorage.getItem('fraudos-notes') || '[]'))
  }, [])

  function save() {
    if (!text.trim()) return
    const updated = [{ text: text.trim(), time: new Date().toLocaleString() }, ...notes]
    setNotes(updated)
    localStorage.setItem('fraudos-notes', JSON.stringify(updated))
    setText('')
    if (toast) toast('Note saved', 'success')
  }

  function del(idx) {
    const updated = notes.filter((_, i) => i !== idx)
    setNotes(updated)
    localStorage.setItem('fraudos-notes', JSON.stringify(updated))
  }

  if (!open) return null
  return (
    <div id="notes-modal" className="modal-overlay notes-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div id="notes-modal-box" className="modal-box">
        <div className="modal-titlebar">
          <span className="modal-title-text">📝 Investigation Notes</span>
          <button id="notes-close-btn" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <textarea id="notes-textarea" className="notes-area" placeholder="Type your investigation note…" value={text} onChange={e => setText(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button id="notes-save-btn" className="btn btn-primary" onClick={save} style={{ flex: 1 }}>Save Note</button>
            <button id="notes-clear-btn" className="btn btn-outline" onClick={() => setText('')}>Clear</button>
          </div>
          <div id="notes-list" className="notes-list">
            {notes.length === 0
              ? <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>No notes yet</div>
              : notes.map((n, i) => (
                <div id={`note-item-${i}`} className="note-item" key={i}>
                  <div className="note-item-header">
                    <span className="note-item-time">{n.time}</span>
                    <button id={`note-delete-btn-${i}`} className="note-delete" onClick={() => del(i)}>✕</button>
                  </div>
                  {n.text}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
