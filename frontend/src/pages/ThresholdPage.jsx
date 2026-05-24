// frontend/src/pages/ThresholdPage.jsx
import React, { useEffect, useState } from 'react'
import WinChrome from '../components/WinChrome'
import api from '../api/client'

export default function ThresholdPage({ onNavigate, toast }) {
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.getThresholds()
      if (res.success) setData(res.data)
    } catch (_) {}
    setLoading(false)
  }

  async function handleChange(thresholdId, val) {
    const n = parseFloat(val)
    if (isNaN(n) || n < 0.5 || n > 0.99) { toast('Invalid value (0.50–0.99)', 'error-toast'); return }
    try {
      const res = await api.proposeThreshold(thresholdId, n)
      if (res.success) {
        toast(res.status === 'blocked' ? 'Blocked: recall regression risk' : 'Proposal submitted — pending approval',
          res.status === 'blocked' ? 'error-toast' : 'info')
        load()
      } else { toast(`Error: ${res.error}`, 'error-toast') }
    } catch (e) { toast(`Network error: ${e.message}`, 'error-toast') }
  }

  async function handleApprove(thresholdId) {
    try {
      const res = await api.approveThreshold(thresholdId)
      if (res.success) {
        toast(`✓ Threshold approved — new value: ${parseFloat(res.new_value).toFixed(2)}`, 'success')
        load()
      } else { toast(`Error: ${res.error}`, 'error-toast') }
    } catch (e) { toast(`Network error: ${e.message}`, 'error-toast') }
  }

  return (
    <div className="page active" id="page-threshold">
      <WinChrome title="Threshold Configuration Panel" onClose={() => onNavigate('desktop')} winId="threshold">
        <div className="inner-card" id="threshold-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="inner-card-title" style={{ marginBottom: 0 }}>⚙ Threshold Configuration</div>
            <span id="threshold-admin-badge" style={{ fontSize: 9.5, background: 'var(--warning-light)', color: '#92400E', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              Admin Role Active
            </span>
          </div>

          <table id="threshold-table" className="threshold-table">
            <thead><tr>
              <th>Category</th><th>Current</th><th>Proposed</th>
              <th>FP Impact</th><th>Recall Impact</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              {loading && <tr className="loading-row"><td colSpan={7}><span className="spinner" />Loading from Aiven…</td></tr>}
              {!loading && data.map(t => {
                const displayStatus = t.proposal_status || t.status
                const proposedVal   = t.proposed_value  != null ? t.proposed_value : t.current_value
                const fpClass  = (t.fp_impact || '').startsWith('-') ? 'pos' : (t.fp_impact || '') === 'No change' ? 'neu' : 'neg'
                const rkClass  = (t.recall_impact || '').startsWith('-') ? 'neg' : (t.recall_impact || '').startsWith('+') ? 'pos' : 'neu'
                return (
                  <tr key={t.id} id={`threshold-row-${t.id}`}>
                    <td style={{ fontWeight: 600 }}>{t.category}</td>
                    <td style={{ fontWeight: 700 }}>{parseFloat(t.current_value).toFixed(2)}</td>
                    <td>
                      <input
                        id={`threshold-input-${t.id}`}
                        className="threshold-input"
                        type="number" min="0.5" max="0.99" step="0.01"
                        defaultValue={parseFloat(proposedVal).toFixed(2)}
                        onBlur={e => handleChange(t.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleChange(t.id, e.target.value)}
                      />
                    </td>
                    <td><span className={`t-chip ${fpClass}`}>{t.fp_impact || '—'}</span></td>
                    <td><span className={`t-chip ${rkClass}`}>{t.recall_impact || '—'}</span></td>
                    <td><span className={`t-status ${displayStatus}`}>{displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}</span></td>
                    <td>
                      {displayStatus === 'pending'
                        ? <button id={`threshold-approve-btn-${t.id}`} className="approve-btn" onClick={() => handleApprove(t.id)}>✓ Approve</button>
                        : displayStatus === 'blocked'
                          ? <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Recall risk — blocked</span>
                          : <button id={`threshold-revise-btn-${t.id}`} className="btn btn-outline" style={{ fontSize: 9, padding: '2px 8px' }}
                              onClick={() => document.getElementById(`threshold-input-${t.id}`)?.focus()}>Revise</button>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div id="threshold-rules-note" style={{ marginTop: 12, padding: '10px 12px', background: 'var(--neutral-8)', borderRadius: 'var(--radius-sm)', fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--navy)' }}>Rules:</strong> Changes require Head of Fraud &amp; Risk sign-off. Proposals reducing recall below 95% are automatically blocked. All changes stored in Aiven PostgreSQL.
          </div>
        </div>
      </WinChrome>
    </div>
  )
}
