import React from 'react'
import { prettyJid } from '../lib/jid'

export type ChatItem = {
  jid: string
  name?: string
  lastText?: string
  lastAt?: number
  unread?: number
}

export const ChatList: React.FC<{
  items: ChatItem[]
  active?: string
  onSelect: (jid: string) => void
  onSearch: (q: string) => void
}> = ({ items, active, onSelect, onSearch }) => {
  const isGroup = (jid: string) => jid.toLowerCase().endsWith('@g.us')

  return (
    <aside style={{ borderRight: '1px solid #eee', width: 320, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: 8 }}>
        <input
          placeholder="Buscar..."
          onChange={(e) => onSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ overflow: 'auto' }}>
        {items.map((it) => (
          <div
            key={it.jid}
            onClick={() => onSelect(it.jid)}
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              background: it.jid === active ? '#f0f7ff' : '#fff',
              borderBottom: '1px solid #f3f3f3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: '#e9eef5',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  userSelect: 'none',
                }}
                title={isGroup(it.jid) ? 'Grupo' : 'Contato'}
              >
                {isGroup(it.jid) ? '👥' : '👤'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.name || prettyJid(it.jid)}
                </div>
                <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.lastText || '...'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {it.lastAt ? new Date(it.lastAt).toLocaleTimeString() : ''}
                </div>
                {!!it.unread && (
                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid #ddd',
                      fontSize: 12,
                    }}
                  >
                    {it.unread}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {!items.length && <div style={{ padding: 12, color: '#888' }}>Sem conversas ainda…</div>}
      </div>
    </aside>
  )
}
