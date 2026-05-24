// frontend/src/components/modals/CalculatorModal.jsx
import React, { useState } from 'react'

export default function CalculatorModal({ open, onClose }) {
  const [val,     setVal]     = useState('0')
  const [prev,    setPrev]    = useState(null)
  const [oper,    setOper]    = useState(null)
  const [newNum,  setNewNum]  = useState(true)
  const [expr,    setExpr]    = useState('')

  function pressNum(n) {
    if (newNum) { setVal(n); setNewNum(false) }
    else setVal(v => v === '0' ? n : v + n)
  }
  function pressDot() {
    if (newNum) { setVal('0.'); setNewNum(false) }
    else setVal(v => v.includes('.') ? v : v + '.')
  }
  function pressOp(op) {
    const p = parseFloat(val); setPrev(p); setOper(op); setNewNum(true)
    setExpr(p + ' ' + op)
  }
  function pressEq() {
    if (!oper || prev == null) return
    const cur = parseFloat(val)
    const ops = {'+':prev+cur,'-':prev-cur,'*':prev*cur,'/':prev/cur}
    const result = ops[oper]
    setExpr(prev + ' ' + oper + ' ' + cur + ' =')
    setVal(String(parseFloat(result.toFixed(10))))
    setPrev(null); setOper(null); setNewNum(true)
  }
  function pressAC() { setVal('0'); setPrev(null); setOper(null); setNewNum(true); setExpr('') }
  function pressSign() { setVal(v => String(parseFloat(v) * -1)) }
  function pressPct()  { setVal(v => String(parseFloat(v) / 100)) }

  if (!open) return null
  const Btn = ({ id, cls, label, onClick }) => <button id={id} className={'calc-btn ' + cls} onClick={onClick}>{label}</button>
  return (
    <div id="calc-modal" className="modal-overlay calc-modal" onClick={e => e.target===e.currentTarget && onClose()}>
      <div id="calc-modal-box" className="modal-box">
        <div className="modal-titlebar">
          <span className="modal-title-text">🧮 Risk Calculator</span>
          <button id="calc-close-btn" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="calc-display" id="calc-display-container">
            <div className="calc-expr" id="calc-expr">{expr}</div>
            <div id="calcDisplay">{val}</div>
          </div>
          <div className="calc-buttons" id="calc-buttons">
            <Btn id="calc-ac-btn"    cls="clr"      label="AC"  onClick={pressAC} />
            <Btn id="calc-sign-btn"  cls="op"       label="+/-" onClick={pressSign} />
            <Btn id="calc-pct-btn"   cls="op"       label="%"   onClick={pressPct} />
            <Btn id="calc-div-btn"   cls="op"       label="÷"   onClick={() => pressOp('/')} />
            {['7','8','9'].map(n => <Btn key={n} id={`calc-num-${n}-btn`} cls="num" label={n} onClick={() => pressNum(n)} />)}
            <Btn id="calc-mul-btn"   cls="op"       label="×"   onClick={() => pressOp('*')} />
            {['4','5','6'].map(n => <Btn key={n} id={`calc-num-${n}-btn`} cls="num" label={n} onClick={() => pressNum(n)} />)}
            <Btn id="calc-sub-btn"   cls="op"       label="−"   onClick={() => pressOp('-')} />
            {['1','2','3'].map(n => <Btn key={n} id={`calc-num-${n}-btn`} cls="num" label={n} onClick={() => pressNum(n)} />)}
            <Btn id="calc-add-btn"   cls="op"       label="+"   onClick={() => pressOp('+')} />
            <Btn id="calc-num-0-btn" cls="num span2" label="0"  onClick={() => pressNum('0')} />
            <Btn id="calc-dot-btn"   cls="num"      label="."   onClick={pressDot} />
            <Btn id="calc-eq-btn"    cls="eq"       label="="   onClick={pressEq} />
          </div>
        </div>
      </div>
    </div>
  )
}
