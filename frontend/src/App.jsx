// frontend/src/App.jsx — FraudOS React Root
import React, { useState, useEffect } from 'react'
import Menubar       from './components/Menubar'
import Dock          from './components/Dock'
import ActivityFeed  from './components/ActivityFeed'
import ToastContainer from './components/ToastContainer'
import { useToast }  from './hooks/useToast'

import DesktopPage     from './pages/DesktopPage'
import DashboardPage   from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import ReportsPage     from './pages/ReportsPage'
import ModelPage       from './pages/ModelPage'
import ThresholdPage   from './pages/ThresholdPage'
import DescriptionPage from './pages/DescriptionPage'

import NotesModal      from './components/modals/NotesModal'
import CalendarModal   from './components/modals/CalendarModal'
import CalculatorModal from './components/modals/CalculatorModal'

export default function App() {
  const [page,  setPage]  = useState('desktop')
  const [modal, setModal] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('fraudos-theme') || 'dark')
  const { toasts, toast } = useToast()

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fraudos-theme', theme)
  }, [theme])

  function navigate(p) { setPage(p) }
  function openModal(id) { setModal(id) }
  function closeModal() { setModal(null) }
  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  return (
    <>
      <div id="wallpaper" />
      <Menubar theme={theme} onToggleTheme={toggleTheme} />

      <div id="os-area">
        <div id="main-section">
          {page === 'desktop'      && <DesktopPage     onNavigate={navigate} onOpenModal={openModal} />}
          {page === 'dashboard'    && <DashboardPage   onNavigate={navigate} toast={toast} />}
          {page === 'transactions' && <TransactionsPage onNavigate={navigate} toast={toast} />}
          {page === 'reports'      && <ReportsPage     onNavigate={navigate} toast={toast} />}
          {page === 'model'        && <ModelPage       onNavigate={navigate} />}
          {page === 'threshold'    && <ThresholdPage   onNavigate={navigate} toast={toast} />}
          {page === 'description'  && <DescriptionPage onNavigate={navigate} />}
        </div>

        <ActivityFeed />
      </div>

      <Dock currentPage={page} onNavigate={navigate} onOpenModal={openModal} />
      <ToastContainer toasts={toasts} />

      <NotesModal      open={modal === 'notes'}    onClose={closeModal} toast={toast} />
      <CalendarModal   open={modal === 'calendar'} onClose={closeModal} toast={toast} />
      <CalculatorModal open={modal === 'calc'}     onClose={closeModal} />
    </>
  )
}
