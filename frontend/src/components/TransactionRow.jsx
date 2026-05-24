// frontend/src/components/TransactionRow.jsx
import React, { useState } from 'react'
import { scoreClass, modelLabel } from '../utils/score'
import api from '../api/client'

export default function TransactionRow({ tx, onAction, cols = 9, showActions = true }) {
  const high = parseFloat(tx.ensemble_score) >= 0.9
  const [chatOpen, setChatOpen] = useState(false)
  const [chatLog, setChatLog] = useState([])
  const [msg, setMsg] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  function ScorePill({ v }) {
    return <span className={`score-pill ${scoreClass(v)}`}>{parseFloat(v).toFixed(2)}</span>
  }

  function StatusBadge({ s }) {
    return <span className={`status-badge ${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
  }

  async function handleSend() {
    if (!msg.trim()) return
    const userMsg = msg
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }])
    setMsg('')
    setIsTyping(true)
    
    try {
      const res = await api.chatWithAgent(tx.id, userMsg)
      if (res.success) {
        setChatLog(prev => [...prev, { role: 'agent', text: res.reply }])
      } else {
        setChatLog(prev => [...prev, { role: 'agent', text: 'Error connecting to Agent Rahul.' }])
      }
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'agent', text: 'Network error.' }])
    }
    setIsTyping(false)
  }

  async function handleExplain() {
    if (!chatOpen) setChatOpen(true)
    const prompt = "Explain exactly why this transaction is highly anomalous in one simple sentence. Highlight the specific data points."
    setChatLog(prev => [...prev, { role: 'user', text: "Can you explain why this was flagged?" }])
    setIsTyping(true)
    
    try {
      const res = await api.chatWithAgent(tx.id, prompt)
      if (res.success) {
        setChatLog(prev => [...prev, { role: 'agent', text: res.reply }])
      } else {
        setChatLog(prev => [...prev, { role: 'agent', text: 'Error connecting to Agent Rahul.' }])
      }
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'agent', text: 'Network error.' }])
    }
    setIsTyping(false)
  }


  const [optimisticStatus, setOptimisticStatus] = useState(null)
  
  const displayStatus = optimisticStatus || tx.status

  async function handleOptimisticAction(actionType) {
    // Instantly update the UI so the user feels immediate feedback
    setOptimisticStatus(actionType)
    // Send the actual API request in the background
    onAction(tx.id, actionType)
  }

  return (
    <React.Fragment>
      <tr id={`tx-row-${tx.id}`} style={
        displayStatus === 'escalated' ? { background: 'rgba(245, 158, 11, 0.08)', opacity: 0.8 } :
        displayStatus === 'fraud' ? { background: 'rgba(220,38,38,0.08)', opacity: 0.8 } :
        displayStatus === 'cleared' ? { background: 'rgba(16, 185, 129, 0.08)', opacity: 0.6 } :
        high ? { background: 'rgba(220,38,38,0.04)' } : {}
      }>
        <td><span className="tx-id">{tx.transaction_ref}</span></td>
        <td><span className="tx-amount">${parseFloat(tx.amount).toLocaleString()}</span></td>
        <td style={{ fontSize: '11px' }}>{tx.location || '—'}</td>
        {cols >= 11 && <td style={{ fontSize: '11px' }}>{tx.merchant || '—'}</td>}
        {cols >= 11 && <td style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{tx.device || '—'}</td>}
        <td><span className={`model-tag ${tx.model_source}`}>{modelLabel(tx.model_source)}</span></td>
        <td><ScorePill v={tx.if_score} /></td>
        <td><ScorePill v={tx.lstm_score} /></td>
        <td><ScorePill v={tx.ensemble_score} /></td>
        {cols >= 11 && (
          <td style={{ maxWidth: 180, fontSize: '11px', color: 'var(--text-secondary)' }}
              title={tx.ai_explanation || ''}>
            {(tx.ai_explanation || '—').substring(0, 80)}{(tx.ai_explanation || '').length > 80 ? '…' : ''}
          </td>
        )}
        <td><StatusBadge s={displayStatus} /></td>
        {showActions && (
          <td>
            <div style={{ display: 'flex', gap: 3 }}>
              <button className="act-btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => setChatOpen(!chatOpen)}>Copilot</button>
              <button className="act-btn" style={{ background: '#8b5cf6', color: 'white' }} onClick={handleExplain}>Explain</button>
              <button id={`tx-${tx.id}-escalate-btn`} className="act-btn" style={{ background: '#f59e0b', color: 'white' }} onClick={() => handleOptimisticAction('escalated')}>Escalate</button>
              <button id={`tx-${tx.id}-fraud-btn`}    className="act-btn fraud"    onClick={() => handleOptimisticAction('fraud')}>Fraud</button>
              <button id={`tx-${tx.id}-clear-btn`}    className="act-btn clear"    onClick={() => handleOptimisticAction('cleared')}>Clear</button>
            </div>
          </td>
        )}
      </tr>
      
      {chatOpen && (
        <tr style={{ background: '#f8fafc' }}>
          <td colSpan={cols + 1} style={{ padding: '10px 20px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', padding: '10px', maxWidth: '600px' }}>
              <div style={{ fontWeight: 600, fontSize: '12px', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                🤖 Agent Rahul - Copilot (TXN: {tx.transaction_ref})
              </div>
              
              <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {chatLog.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Ask Agent Rahul a question about this transaction...</span>}
                {chatLog.map((c, i) => (
                  <div key={i} style={{ 
                    padding: '6px 8px', borderRadius: '4px', maxWidth: '85%', 
                    background: c.role === 'user' ? '#eff6ff' : '#f1f5f9',
                    alignSelf: c.role === 'user' ? 'flex-end' : 'flex-start',
                    border: c.role === 'user' ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                  }}>
                    <strong style={{ display: 'block', fontSize: '9px', color: c.role === 'user' ? '#2563eb' : '#475569', marginBottom: '2px' }}>
                      {c.role === 'user' ? 'You' : 'Agent Rahul'}
                    </strong>
                    {c.text}
                  </div>
                ))}
                {isTyping && <div style={{ fontSize: '10px', color: '#94a3b8', padding: '4px' }}>Agent Rahul is typing...</div>}
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  value={msg} 
                  onChange={e => setMsg(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="E.g., Does this device ID match previous fraud?" 
                  style={{ flex: 1, padding: '6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
                <button onClick={handleSend} style={{ background: '#0f172a', color: 'white', padding: '4px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}>
                  Ask
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}
