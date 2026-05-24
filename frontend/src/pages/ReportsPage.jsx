// frontend/src/pages/ReportsPage.jsx
import React, { useEffect, useState } from 'react'
import WinChrome from '../components/WinChrome'
import api from '../api/client'

export default function ReportsPage({ onNavigate, toast }) {
  const [today, setToday]     = useState(null)
  const [archive, setArchive] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadToday(), loadArchive()])
  }, [])

  async function loadToday() {
    try {
      const res = await api.getTodayReport()
      if (res.success) setToday(res.data)
    } catch (_) {}
  }

  async function loadArchive() {
    setLoading(true)
    try {
      const res = await api.getReports()
      if (res.success) setArchive(res.data)
    } catch (_) {}
    setLoading(false)
  }

  async function handleDownload(date) {
    toast('📄 Generating PDF…', 'info')
    try {
      await api.downloadPDF(date)
      toast('✓ PDF downloaded successfully', 'success')
    } catch (e) { toast(`PDF error: ${e.message}`, 'error-toast') }
  }

  function fmt(v, pct = false) {
    if (v == null) return '—'
    const n = parseFloat(v)
    return pct ? (n * 100).toFixed(1) + '%' : n.toString()
  }

  return (
    <div className="page active" id="page-reports">
      <WinChrome title="Compliance Reports" onClose={() => onNavigate('desktop')} winId="reports">

        {/* Today's report */}
        <div className="inner-card" id="reports-today-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="inner-card-title" style={{ marginBottom: 2 }}>Daily Compliance Report — Today</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Auto-generated · Delivered to Compliance Team, Head of Fraud &amp; Risk, CCO
              </div>
            </div>
            <button id="reports-today-download-btn" className="btn btn-primary" onClick={() => handleDownload('today')}>⬇ Download PDF</button>
          </div>
          <div className="report-metrics" id="reports-metrics-grid">
            <div className="report-metric" id="reports-metric-processed">
              <div className="rv" style={{ color: 'var(--purple)' }}>{today ? parseInt(today.total_processed || 0).toLocaleString() : '—'}</div>
              <div className="rl">Processed</div>
            </div>
            <div className="report-metric" id="reports-metric-flagged">
              <div className="rv" style={{ color: 'var(--warning)' }}>{today?.total_flagged ?? '—'}</div>
              <div className="rl">Flagged</div>
            </div>
            <div className="report-metric" id="reports-metric-fraud">
              <div className="rv" style={{ color: 'var(--error)' }}>{today?.confirmed_fraud ?? '—'}</div>
              <div className="rl">Confirmed Fraud</div>
            </div>
            <div className="report-metric" id="reports-metric-fprate">
              <div className="rv" style={{ color: 'var(--success)' }}>{today ? fmt(today.fp_rate, true) : '—'}</div>
              <div className="rl">FP Rate</div>
            </div>
            <div className="report-metric" id="reports-metric-review">
              <div className="rv" style={{ color: 'var(--purple)' }}>{today ? fmt(today.review_completion, true) : '—'}</div>
              <div className="rl">Review Completion</div>
            </div>
            <div className="report-metric" id="reports-metric-llm">
              <div className="rv" style={{ color: 'var(--cyan)' }}>{today ? fmt(today.llm_helpful_rate, true) : '—'}</div>
              <div className="rl">LLM Helpful Rate</div>
            </div>
          </div>
        </div>

        {/* Archive table */}
        <div className="inner-card" id="reports-archive-card">
          <div className="inner-card-title">Report Archive</div>
          <table id="reports-archive-table" className="tx-table">
            <thead><tr>
              <th>Date</th><th>Transactions</th><th>Flagged</th><th>Fraud</th>
              <th>FP Rate</th><th>F1 Score</th><th>Download</th>
            </tr></thead>
            <tbody>
              {loading && <tr className="loading-row"><td colSpan={7}><span className="spinner" />Loading…</td></tr>}
              {!loading && archive.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>No reports found</td></tr>
              )}
              {!loading && archive.map(r => {
                const fp = r.fp_rate ? parseFloat(r.fp_rate) : null
                return (
                  <tr key={r.id} id={`reports-archive-row-${r.report_date}`}>
                    <td>{r.report_date}</td>
                    <td>{parseInt(r.total_processed || 0).toLocaleString()}</td>
                    <td>{r.total_flagged || 0}</td>
                    <td>{r.confirmed_fraud || 0}</td>
                    <td style={{ color: fp != null && fp < 0.30 ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                      {fp != null ? (fp * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td>{r.f1_ensemble ? parseFloat(r.f1_ensemble).toFixed(3) : '—'}</td>
                    <td>
                      <button
                        id={`reports-archive-download-btn-${r.report_date}`}
                        className="btn btn-outline"
                        style={{ fontSize: 10, padding: '3px 9px' }}
                        onClick={() => handleDownload(r.report_date)}>⬇ Download</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </WinChrome>
    </div>
  )
}
