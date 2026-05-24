// frontend/src/pages/ModelPage.jsx
import React, { useEffect, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import WinChrome from '../components/WinChrome'
import api from '../api/client'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

function MetricBar({ value, color = 'mf-purple' }) {
  return <div className="metric-bar"><div className={`metric-fill ${color}`} style={{ width: `${parseFloat(value || 0) * 100}%` }} /></div>
}

function PerfCard({ title, subtitle, prefix, metrics }) {
  const m = metrics.find(r => r.model_name === prefix) || {}
  const fmt = (v, pct = true) => v != null ? (pct ? (parseFloat(v) * 100).toFixed(1) + '%' : parseFloat(v).toFixed(3)) : '—'
  return (
    <div className="perf-card" id={`model-perf-card-${prefix}`}>
      <div className="perf-model-name">{title}</div>
      <div className="perf-model-type">{subtitle}</div>
      <div className="metric-row"><span className="metric-label">Precision</span><span className="metric-value" style={{ color: 'var(--purple)' }}>{fmt(m.precision_val)}</span></div>
      <MetricBar value={m.precision_val} color="mf-purple" />
      <div className="metric-row"><span className="metric-label">Recall</span><span className="metric-value" style={{ color: 'var(--success)' }}>{fmt(m.recall_val)}</span></div>
      <MetricBar value={m.recall_val} color="mf-success" />
      <div className="metric-row"><span className="metric-label">F1 Score</span><span className="metric-value">{fmt(m.f1_score, false)}</span></div>
      <div className="metric-row"><span className="metric-label">FP Rate</span><span className="metric-value" style={{ color: 'var(--warning)' }}>{fmt(m.fp_rate)}</span></div>
    </div>
  )
}

export default function ModelPage({ onNavigate }) {
  const [metrics, setMetrics] = useState([])
  const [fpTrend, setFpTrend] = useState([])
  const [audit,   setAudit]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadMetrics(), loadFpTrend(), loadAudit()])
  }, [])

  async function loadMetrics() {
    const res = await api.getModelMetrics()
    if (res.success) setMetrics(res.data)
  }
  async function loadFpTrend() {
    const res = await api.getFpTrend()
    if (res.success) setFpTrend(res.data)
  }
  async function loadAudit() {
    setLoading(true)
    const res = await api.getAuditLog(15)
    if (res.success) setAudit(res.data)
    setLoading(false)
  }

  const fpLabels = fpTrend.length ? fpTrend.map(r => r.week_label)  : ['W1','W2','W3','W4','W5','W6','W7','W8']
  const fpVals   = fpTrend.length ? fpTrend.map(r => parseFloat(r.ensemble_fp || 0) * 100) : [92,84,71,60,48,39,33,28.4]

  const fpChartData = {
    labels: fpLabels,
    datasets: [
      { label: 'FP Rate %', data: fpVals, borderColor: '#DC2626', backgroundColor: 'rgba(220,38,38,0.08)', tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2.5 },
      { label: 'Target (30%)', data: fpLabels.map(() => 30), borderColor: '#16A34A', borderDash: [6, 4], borderWidth: 2, pointRadius: 0 },
    ],
  }
  const fpOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { family: 'Poppins', size: 10 } } } },
    scales: {
      x: { ticks: { font: { family: 'Poppins', size: 10 } }, grid: { display: false } },
      y: { min: 0, max: 100, ticks: { font: { family: 'Poppins', size: 9 }, callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,0.04)' } },
    },
  }

  return (
    <div className="page active" id="page-model">
      <WinChrome title="Model Performance Panel" onClose={() => onNavigate('desktop')} winId="model">

        <div className="perf-grid" id="model-perf-grid">
          <PerfCard title="Isolation Forest" subtitle="Point Anomaly Detection"  prefix="isolation_forest" metrics={metrics} />
          <PerfCard title="LSTM Network"     subtitle="Sequential Pattern Detection" prefix="lstm"         metrics={metrics} />
          <PerfCard title="Ensemble Model"   subtitle="IF + LSTM Combined"       prefix="ensemble"         metrics={metrics} />
        </div>

        <div className="inner-card" id="model-fp-trend-card">
          <div className="inner-card-title">False Positive Rate Trend — Weekly</div>
          <div id="model-fp-chart" style={{ position: 'relative', height: 190 }}>
            <Line data={fpChartData} options={fpOpts} />
          </div>
        </div>

        <div className="inner-card" id="model-audit-card">
          <div className="inner-card-title">Audit Log — All Investigator Decisions</div>
          <table id="model-audit-table" className="tx-table">
            <thead><tr>
              <th>Investigator</th><th>TX Reference</th><th>Action</th>
              <th>Score</th><th>Timestamp</th><th>Notes</th>
            </tr></thead>
            <tbody>
              {loading && <tr className="loading-row"><td colSpan={6}><span className="spinner" />Loading…</td></tr>}
              {!loading && audit.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>No decisions yet</td></tr>}
              {!loading && audit.map(a => (
                <tr key={a.id} id={`model-audit-row-${a.id}`}>
                  <td>{a.investigator_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--purple)' }}>{a.transaction_ref}</td>
                  <td style={{ fontWeight: 700, color: a.action === 'fraud' ? 'var(--error)' : a.action === 'cleared' ? 'var(--success)' : 'var(--warning)' }}>
                    {a.action.toUpperCase()}
                  </td>
                  <td style={{ fontWeight: 700 }}>{parseFloat(a.ensemble_score).toFixed(2)}</td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {new Date(a.decided_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </WinChrome>
    </div>
  )
}
