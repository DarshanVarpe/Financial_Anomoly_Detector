// frontend/src/pages/TransactionsPage.jsx
import React, { useEffect, useState, useCallback } from 'react'
import WinChrome from '../components/WinChrome'
import TransactionRow from '../components/TransactionRow'
import api from '../api/client'

export default function TransactionsPage({ onNavigate, toast }) {
  const [txs, setTxs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [model, setModel]     = useState('')
  const [score, setScore]     = useState('')
  const [status, setStatus]   = useState('')

  const load = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      const res = await api.getTransactions(filters)
      if (res.success) setTxs(res.data)
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    // Setup WebSocket for Real-Time Event Streaming
    const wsUrl = `ws://localhost:5000/api/ws`
    console.log("Attempting to connect WebSocket to:", wsUrl)
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log("✅ WebSocket Connected Successfully to FraudOS Backend!");
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Toast notification for real-time push
        toast(`🚨 REAL-TIME ALERT: ${data.transaction_ref} ($${data.amount}) flagged!`, 'error-toast')
        // Refresh the table instantly
        load()
      } catch(e) {}
    }
    
    return () => {
      if (ws.readyState === 1) {
        ws.close()
      }
    }
  }, [load, toast])

  function buildFilters(overrides = {}) {
    const s  = overrides.search  ?? search
    const m  = overrides.model   ?? model
    const sc = overrides.score   ?? score
    const st = overrides.status  ?? status
    const minScore = sc === 'high' ? 0.85 : sc === 'mid' ? 0.6 : ''
    const maxScore = sc === 'mid'  ? 0.84 : sc === 'low' ? 0.59 : ''
    return { search: s, model_source: m, min_score: minScore, max_score: maxScore, status: st }
  }

  function handleChange(setter, field, val) {
    setter(val)
    load(buildFilters({ [field]: val }))
  }

  async function handleAction(txId, action) {
    try {
      const res = await api.takeAction(txId, action)
      if (res.success) {
        const labels = { fraud: '✕ Fraud confirmed', cleared: '✓ Cleared', escalated: '↑ Escalated' }
        const types  = { fraud: 'error-toast', cleared: 'success', escalated: 'warning-t' }
        toast(`${labels[action]}: ${res.transaction_ref}`, types[action])
        load(buildFilters())
      } else { toast(`Error: ${res.error}`, 'error-toast') }
    } catch (e) { toast(`Network error: ${e.message}`, 'error-toast') }
  }

  return (
    <div className="page active" id="page-transactions">
      <WinChrome title="Flagged Transaction Review Queue" onClose={() => onNavigate('desktop')} winId="transactions">
        <div className="table-card" id="transactions-table-card" style={{ marginBottom: 0 }}>
          <div className="table-toolbar" id="transactions-toolbar">
            <div className="search-box" style={{ flex: 1 }}>
              <span style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input
                id="transactions-search-input"
                type="text"
                placeholder="Search by ID, location, amount…"
                value={search}
                onChange={e => handleChange(setSearch, 'search', e.target.value)}
              />
            </div>
            <select id="transactions-model-select" className="filter-select" value={model} onChange={e => handleChange(setModel, 'model', e.target.value)}>
              <option value="">All Models</option>
              <option value="isolation_forest">IF</option>
              <option value="lstm">LSTM</option>
              <option value="ensemble">Ensemble</option>
            </select>
            <select id="transactions-score-select" className="filter-select" value={score} onChange={e => handleChange(setScore, 'score', e.target.value)}>
              <option value="">Any Score</option>
              <option value="high">High (&gt;0.85)</option>
              <option value="mid">Medium</option>
              <option value="low">Low</option>
            </select>
            <select id="transactions-status-select" className="filter-select" value={status} onChange={e => handleChange(setStatus, 'status', e.target.value)}>
              <option value="">All Status</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="fraud">Fraud</option>
              <option value="cleared">Cleared</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table id="transactions-table" className="tx-table">
              <thead><tr>
                <th>TX ID</th><th>Amount</th><th>Location</th><th>Merchant</th>
                <th>Device</th><th>Model</th><th>IF Score</th><th>LSTM Score</th>
                <th>Ensemble</th><th>AI Explanation</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {loading && <tr className="loading-row"><td colSpan={12}><span className="spinner" />Loading from Aiven…</td></tr>}
                {!loading && txs.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No transactions match filters</td></tr>
                )}
                {!loading && txs.map(tx => (
                  <TransactionRow key={tx.id} tx={tx} onAction={handleAction} cols={11} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </WinChrome>
    </div>
  )
}
