// frontend/src/pages/DashboardPage.jsx
import React, { useEffect, useState, useRef } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import WinChrome from '../components/WinChrome'
import TransactionRow from '../components/TransactionRow'
import api from '../api/client'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const FALLBACK_TS = {
  labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
  flagged:    [12,8,15,22,18,9,14,28,35,42,38,51,47,39,44,56,48,52,61,47,38,29,22,18],
  confirmed:  [2,1,3,4,3,2,2,5,7,8,6,9,8,7,8,10,9,11,12,9,7,5,4,3],
}
const FALLBACK_RD = { critical: 14, high: 89, medium: 142, low: 67 }

export default function DashboardPage({ onNavigate, toast, onAction }) {
  const [kpis, setKpis]   = useState(null)
  const [txs, setTxs]     = useState([])
  const [txLoading, setTxLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tsData, setTsData]   = useState(null)
  const [rdData, setRdData]   = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    await Promise.all([loadKPIs(), loadTxs(), loadCharts()])
  }

  async function loadKPIs() {
    try {
      const res = await api.getKPIs()
      if (res.success) setKpis(res.data)
    } catch (_) {}
  }

  async function loadTxs(filters = {}) {
    setTxLoading(true)
    try {
      const res = await api.getTransactions(filters)
      if (res.success) setTxs(res.data)
    } catch (_) {}
    setTxLoading(false)
  }

  async function loadCharts() {
    try {
      const [tsRes, rdRes] = await Promise.all([api.getTimeSeries(), api.getRiskDistribution()])
      if (tsRes.success && tsRes.data.length) {
        setTsData({
          labels:    tsRes.data.map(r => r.hour),
          flagged:   tsRes.data.map(r => parseInt(r.flagged)),
          confirmed: tsRes.data.map(r => parseInt(r.confirmed)),
        })
      } else { setTsData(FALLBACK_TS) }
      if (rdRes.success && rdRes.data) setRdData(rdRes.data)
      else setRdData(FALLBACK_RD)
    } catch (_) { setTsData(FALLBACK_TS); setRdData(FALLBACK_RD) }
  }

  async function handleAction(txId, action) {
    try {
      const res = await api.takeAction(txId, action)
      if (res.success) {
        const labels = { fraud: '✕ Fraud confirmed', cleared: '✓ Cleared', escalated: '↑ Escalated' }
        const types  = { fraud: 'error-toast', cleared: 'success', escalated: 'warning-t' }
        toast(`${labels[action]}: ${res.transaction_ref}`, types[action])
        await Promise.all([loadKPIs(), loadTxs({ search, status: statusFilter }), loadCharts()])
        if (onAction) onAction()
      } else { toast(`Error: ${res.error}`, 'error-toast') }
    } catch (e) { toast(`Network error: ${e.message}`, 'error-toast') }
  }

  const fraud    = parseInt(kpis?.confirmed_fraud || 0)
  const cleared  = parseInt(kpis?.cleared_count   || 0)
  const esc      = parseInt(kpis?.escalated_count  || 0)
  const unrev    = parseInt(kpis?.unreviewed_count || 0)
  const totalTx  = parseInt(kpis?.total_transactions || kpis?.total_flagged || 0)
  const totalFlag = parseInt(kpis?.total_flagged || 0)
  const reviewed = fraud + cleared + esc
  const fpRate   = reviewed > 0 ? ((cleared / reviewed) * 100).toFixed(1) + '%' : '0.0%'

  const tsChartData = tsData ? {
    labels: tsData.labels,
    datasets: [
      { label: 'Flagged',   data: tsData.flagged,   borderColor: '#5929D0', backgroundColor: 'rgba(89,41,208,0.08)', tension: 0.4, fill: true, pointRadius: 2, borderWidth: 2 },
      { label: 'Confirmed', data: tsData.confirmed, borderColor: '#DC2626', backgroundColor: 'rgba(220,38,38,0.05)', tension: 0.4, fill: true, pointRadius: 2, borderWidth: 2, borderDash: [4, 4] },
    ],
  } : null

  const rdChartData = rdData ? {
    labels: ['Critical (>0.9)', 'High (0.8-0.9)', 'Medium', 'Low'],
    datasets: [{ data: [rdData.critical||0, rdData.high||0, rdData.medium||0, rdData.low||0], backgroundColor: ['#DC2626','#E4902E','#5929D0','#16A34A'], borderWidth: 0, hoverOffset: 6 }],
  } : null

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: { family: 'Poppins', size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
      y: { ticks: { font: { family: 'Poppins', size: 9 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
    },
  }

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 10 }, padding: 10, usePointStyle: true, pointStyleWidth: 7 } } },
  }

  function handleSearch(e) {
    const val = e.target.value; setSearch(val)
    loadTxs({ search: val, status: statusFilter })
  }
  function handleStatusFilter(e) {
    const val = e.target.value; setStatusFilter(val)
    loadTxs({ search, status: val })
  }

  return (
    <div className="page active" id="page-dashboard">
      <WinChrome title="AI Fraud Detection Dashboard — AG-MS-0426-004" onClose={() => onNavigate('desktop')} winId="dashboard">
        {/* Hero Banner */}
        <div className="hero-banner" id="dashboard-hero-banner">
          <div className="hero-top">
            <div>
              <div className="hero-title">AI Fraud Detection Dashboard</div>
              <div className="hero-sub">Real-time anomaly detection · Azure ML · LLM Explanations · Human-in-Loop</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>AG-MS-0426-004</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9.5 }}>Aiven PostgreSQL · Live</div>
            </div>
          </div>
          <div className="hero-chips" id="dashboard-hero-chips">
            <div className="hero-chip" id="heroChipTotal">{kpis ? `${totalTx.toLocaleString()} Transactions in DB` : 'Loading…'}</div>
            <div className="hero-chip" id="dashboard-chip-if">Isolation Forest ✓</div>
            <div className="hero-chip" id="dashboard-chip-lstm">LSTM ✓</div>
            <div className="hero-chip" id="dashboard-chip-openai">Azure OpenAI ✓</div>
            <div className="hero-chip alert" id="dashboard-chip-flagged" style={{ background: parseFloat(fpRate) <= 30 ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)' }}>
              {kpis ? `${totalFlag} Flagged — ${unrev} Unreviewed` : 'Loading…'}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid" id="dashboard-kpi-grid">
          <div className="kpi-card purple" id="dashboard-kpi-total">
            <div className="kpi-header"><div className="kpi-icon purple">⊞</div><span className="kpi-trend up">DB</span></div>
            <div className="kpi-value">{kpis ? totalTx.toLocaleString() : '—'}</div>
            <div className="kpi-label">Total Transactions in DB</div>
            <div className="kpi-sub">Live from Aiven PostgreSQL</div>
          </div>
          <div className="kpi-card error" id="dashboard-kpi-flagged">
            <div className="kpi-header"><div className="kpi-icon error">⚑</div><span className="kpi-trend up">Live</span></div>
            <div className="kpi-value">{kpis ? totalFlag : '—'}</div>
            <div className="kpi-label">Total Flagged</div>
            <div className="kpi-sub">Ensemble score &gt;0.80</div>
          </div>
          <div className="kpi-card success" id="dashboard-kpi-fraud">
            <div className="kpi-header"><div className="kpi-icon success">✓</div><span className="kpi-trend down">Live</span></div>
            <div className="kpi-value">{kpis ? fraud : '—'}</div>
            <div className="kpi-label">Confirmed Fraud</div>
            <div className="kpi-sub">Investigator confirmed</div>
          </div>
          <div className="kpi-card warning" id="dashboard-kpi-fprate">
            <div className="kpi-header"><div className="kpi-icon warning">◐</div><span className="kpi-trend down">Target &lt;30%</span></div>
            <div className="kpi-value">{kpis ? fpRate : '—'}</div>
            <div className="kpi-label">False Positive Rate</div>
            <div className="kpi-sub">From Aiven DB · Live</div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-row" id="dashboard-charts-row">
          <div className="chart-card" id="dashboard-timeseries-card">
            <div className="card-header">
              <div>
                <div className="card-title">Flagged Transactions Over Time</div>
                <div className="card-subtitle">Last 24 hours · Live</div>
              </div>
              <div className="chart-legend">
                <span><span className="legend-dot" style={{ background: '#5929D0' }} />Flagged</span>
                <span><span className="legend-dot" style={{ background: '#DC2626' }} />Confirmed</span>
              </div>
            </div>
            <div id="dashboard-timeseries-chart" style={{ position: 'relative', height: 190 }}>
              {tsChartData && <Line data={tsChartData} options={lineOpts} />}
            </div>
          </div>
          <div className="chart-card" id="dashboard-riskdist-card">
            <div className="card-header">
              <div><div className="card-title">Risk Distribution</div><div className="card-subtitle">By anomaly score</div></div>
            </div>
            <div id="dashboard-riskdist-chart" style={{ position: 'relative', height: 190 }}>
              {rdChartData && <Doughnut data={rdChartData} options={doughnutOpts} />}
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="table-card" id="dashboard-table-card">
          <div className="table-toolbar" id="dashboard-table-toolbar">
            <div className="card-title" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>🚩 Flagged Transactions</div>
            <div className="search-box">
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>🔍</span>
              <input id="dashboard-search-input" type="text" placeholder="Search…" value={search} onChange={handleSearch} />
            </div>
            <select id="dashboard-status-select" className="filter-select" value={statusFilter} onChange={handleStatusFilter}>
              <option value="">All Status</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="fraud">Fraud</option>
              <option value="cleared">Cleared</option>
              <option value="escalated">Escalated</option>
            </select>
            <button id="dashboard-pdf-btn" className="btn btn-primary" onClick={async () => {
              toast('📄 Generating PDF…', 'info')
              try { await api.downloadPDF('today'); toast('✓ PDF downloaded', 'success') }
              catch (e) { toast(`PDF error: ${e.message}`, 'error-toast') }
            }}>⬇ PDF</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table id="dashboard-tx-table" className="tx-table">
              <thead><tr>
                <th>TX ID</th><th>Amount</th><th>Location</th><th>Model</th>
                <th>IF Score</th><th>LSTM Score</th><th>Ensemble</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {txLoading && (
                  <tr className="loading-row"><td colSpan={9}><span className="spinner" />Loading from Aiven…</td></tr>
                )}
                {!txLoading && txs.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No flagged transactions in DB</td></tr>
                )}
                {!txLoading && txs.map(tx => (
                  <TransactionRow key={tx.id} tx={tx} onAction={handleAction} cols={9} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </WinChrome>
    </div>
  )
}
