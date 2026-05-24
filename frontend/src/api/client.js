// frontend/src/api/client.js — FraudOS React API client

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_INV_ID = '11111111-0000-0000-0000-000000000001'

async function request(url, options = {}) {
  const res = await fetch(url, options)
  return res.json()
}

const api = {
  // Transactions
  getTransactions(filters = {}) {
    const params = new URLSearchParams()
    if (filters.status)       params.set('status',       filters.status)
    if (filters.model_source) params.set('model_source', filters.model_source)
    if (filters.min_score)    params.set('min_score',    filters.min_score)
    if (filters.max_score)    params.set('max_score',    filters.max_score)
    if (filters.search)       params.set('search',       filters.search)
    const qs = params.toString() ? '?' + params.toString() : ''
    return request(API_BASE + '/transactions' + qs)
  },
  takeAction(txId, action, notes) {
    return request(API_BASE + '/transactions/' + txId + '/action', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes: notes || '', investigator_id: DEFAULT_INV_ID }),
    })
  },
  chatWithAgent(txId, message) {
    return request(API_BASE + '/transactions/' + txId + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
  },
  // Dashboard
  getKPIs()            { return request(API_BASE + '/dashboard/kpis') },
  getTimeSeries()      { return request(API_BASE + '/dashboard/chart/timeseries') },
  getRiskDistribution(){ return request(API_BASE + '/dashboard/chart/risk-distribution') },
  getAuditLog(n)       { return request(API_BASE + '/dashboard/audit-log?limit=' + (n||20)) },
  getActivityLog(n)    { return request(API_BASE + '/dashboard/activity-log?limit=' + (n||30)) },
  // Model
  getModelMetrics()    { return request(API_BASE + '/model/metrics') },
  getFpTrend()         { return request(API_BASE + '/model/fp-trend') },
  getThresholds()      { return request(API_BASE + '/model/thresholds') },
  proposeThreshold(id, val) {
    return request(API_BASE + '/model/thresholds/' + id + '/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed_value: val, investigator_id: DEFAULT_INV_ID }),
    })
  },
  approveThreshold(id) {
    return request(API_BASE + '/model/thresholds/' + id + '/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investigator_id: DEFAULT_INV_ID }),
    })
  },
  // Reports
  getReports()         { return request(API_BASE + '/reports') },
  getTodayReport()     { return request(API_BASE + '/reports/today') },
  async downloadPDF(date) {
    const d = date || 'today'
    const res = await fetch(API_BASE + '/reports/' + d + '/pdf')
    if (!res.ok) { let e='Server error'; try{const j=await res.json();e=j.error||e}catch(_){}; throw new Error(e) }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'FraudOS_Report_' + d + '.pdf'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  },
}

export default api
