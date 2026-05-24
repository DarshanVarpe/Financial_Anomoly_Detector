// frontend/src/components/ActivityFeed.jsx
import React, { useEffect, useState, useCallback } from 'react'
import api from '../api/client'

const BADGE_LABEL = { detection: 'Detection', alert: 'Alert', clear: 'Cleared', activity: 'Action' }

export default function ActivityFeed() {
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    try {
      const res = await api.getActivityLog(25)
      if (res.success) setItems(res.data)
    } catch (_) {}
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 12000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div id="commentary-section">
      <div className="commentary-header" id="activity-feed-header">
        <span className="commentary-title" id="activity-feed-title">Live Activity</span>
        <div className="live-pill" id="activity-live-pill"><span className="live-pulse" />LIVE</div>
      </div>
      <div className="commentary-feed" id="commentaryFeed">
        {items.length === 0 && (
          <div className="cf-item" id="activity-connecting-item">
            <div className="cf-dot activity" />
            <div className="cf-info">
              <span className="cf-badge activity">System</span>
              <div className="cf-desc">Connecting to Aiven…</div>
              <div className="cf-time">now</div>
            </div>
          </div>
        )}
        {items.map(a => (
          <div id={`activity-item-${a.id}`} className="cf-item" key={a.id}>
            <div className={`cf-dot ${a.event_type}`} />
            <div className="cf-info">
              <span className={`cf-badge ${a.event_type}`}>{BADGE_LABEL[a.event_type] || 'Action'}</span>
              <div className="cf-desc">{a.description}</div>
              <div className="cf-time">
                {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
