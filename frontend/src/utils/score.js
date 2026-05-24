// frontend/src/utils/score.js
export function scoreClass(v) {
  const n = parseFloat(v)
  return n >= 0.85 ? 'high' : n >= 0.6 ? 'mid' : 'low'
}

export function modelLabel(s) {
  return { isolation_forest: 'IF', lstm: 'LSTM', ensemble: 'Ens' }[s] || s
}

export function fmtAmount(v) {
  return '$' + parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 })
}
