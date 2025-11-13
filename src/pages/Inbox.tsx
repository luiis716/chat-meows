import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChatList, ChatItem } from '../components/ChatList'
import { Composer } from '../components/Composer'
import { MessageBubble } from '../components/MessageBubble'
import {
  isFromMe, messageChatJid, messageSenderJid, messageText, messageTimestamp,
  isReceipt, receiptIds, receiptType, isPresence, messageId
} from '../lib/fromMe'
import { pickChatKey, displayName, isLid, isJid } from '../lib/jid'

type MsgStatus = 'sent'|'delivered'|'read'|'played'
type Media = { kind:'image'|'video'|'audio'|'document', dataURL:string, mime?:string, filename?:string }
type Message = {
  id: string, chatKey: string, chatJID?: string, chatLID?: string,
  from: string, text: string, at: number, fromMe?: boolean, status?: MsgStatus, media?: Media
}

function wsUrl(){ const base = (import.meta as any).env.VITE_WS_BASE || ''; return base.replace('http','ws') + '/ws' }
function apiUrl(p:string){ return ((import.meta as any).env.VITE_API_BASE || '') + p }

// ---- Persistência (localStorage) ----
const LS_KEY = 'meowcrm_inbox_v1'
type PersistShape = {
  active?: string
  aliases?: Record<string,string> // LID -> JID
  map?: Record<string, Message[]>
}
function loadState(): PersistShape {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : {} } catch { return {} }
}
function saveState(state: PersistShape) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch {}
}

export const Inbox: React.FC = () => {
  const initial = loadState()
  const [active, setActive] = useState<string>(initial.active || '')
  const [map, setMap] = useState<Record<string, Message[]>>(initial.map || {})
  const [aliases, setAliases] = useState<Record<string,string>>(initial.aliases || {}) // LID → JID
  const [search, setSearch] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const [stickBottom, setStickBottom] = useState(true)

  // salvar no localStorage sempre que algo relevante mudar
  useEffect(() => {
    saveState({ active, map, aliases })
  }, [active, map, aliases])

  // autoscroll helpers
  const isNearBottom = () => {
    const el = messagesRef.current; if (!el) return true
    const threshold = 64
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }
  const scrollToBottom = () => {
    const el = messagesRef.current; if (!el) return
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }
  useEffect(() => {
    const el = messagesRef.current; if (!el) return
    const onScroll = () => setStickBottom(isNearBottom())
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // util: aplica alias LID->JID numa chave
  const canonicalKey = (key: string) => {
    if (isLid(key) && aliases[key]) return aliases[key]
    return key
  }

  // WebSocket (realtime) — novas mensagens vão pro fim; receipts atualizam status
  useEffect(()=>{
    const ws = new WebSocket(wsUrl())
    ws.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data)

        // presença ignora
        if (isPresence(e)) return

        // receipts
        if (isReceipt(e)) {
          const ids = receiptIds(e)
          const kind = receiptType(e)
          if (!ids.length) return
          setMap(prev => {
            const copy: Record<string, Message[]> = {}
            for (const [key, arr] of Object.entries(prev)) {
              copy[key] = arr.map(m => {
                if (ids.includes(m.id) && m.fromMe) {
                  const next: MsgStatus = kind === 'read' ? 'read' : (kind === 'played' ? 'played' : 'delivered')
                  return { ...m, status: next }
                }
                return m
              })
            }
            return copy
          })
          return
        }

        // evento de mensagem normalizado do backend (com chatJID/chatLID)
        if (e?.type === 'message') {
          const chatJID: string|undefined = e.chatJID || undefined
          const chatLID: string|undefined = e.chatLID || undefined

          // atualizar alias (se veio jid e lid juntos)
          if (chatJID && chatLID) {
            setAliases(prev => {
              if (prev[chatLID] === chatJID) return prev
              const next = { ...prev, [chatLID]: chatJID }
              // se ativo era LID, migra seleção
              if (active && active === chatLID) setActive(chatJID)
              return next
            })
          }

          const keyRaw = pickChatKey(chatJID, chatLID)
          if (!keyRaw) return
          const key = canonicalKey(keyRaw)

          const m: Message = {
            id: String(e.id || Math.random()),
            chatKey: key,
            chatJID, chatLID,
            from: e.from || chatJID || chatLID || key,
            text: e.text || '',
            at: e.at || Date.now(),
            fromMe: !!e.fromMe,
            status: 'sent',
            media: e.media ? {
              kind: e.media.kind,
              dataURL: e.media.dataURL,
              mime: e.media.mime,
              filename: e.media.filename
            } : undefined
          }

          const shouldStick = stickBottom && (!active || canonicalKey(active) === key)
          setMap(prev => {
            let targetKey = key
            if (isLid(key) && aliases[key]) targetKey = aliases[key] // migrar LID->JID
            const current = prev[targetKey] ? [...prev[targetKey]] : []
            if (!current.find(x => x.id === m.id)) current.push(m)
            return { ...prev, [targetKey]: current }
          })
          if (!active) setActive(key)
          if (shouldStick) scrollToBottom()
          return
        }

        // fallback (sem normalização do back): usa heurísticas
        const rawChat = messageChatJid(e) // pode vir JID ou LID
        if (!rawChat) return
        const key = canonicalKey(rawChat)
        const text = messageText(e)
        const id = messageId(e) || String(Math.random())
        const msg: Message = {
          id,
          chatKey: key,
          chatJID: isJid(rawChat) ? rawChat : undefined,
          chatLID: isLid(rawChat) ? rawChat : undefined,
          from: messageSenderJid(e) || rawChat,
          text,
          at: messageTimestamp(e),
          fromMe: isFromMe(e),
          status: 'sent'
        }
        if (!msg.text && !msg.fromMe) return
        const shouldStick = stickBottom && (!active || canonicalKey(active) === key)
        setMap(prev => {
          const arr = prev[key] ? [...prev[key]] : []
          if (!arr.find(x => x.id === msg.id)) arr.push(msg)
          return { ...prev, [key]: arr }
        })
        if (!active) setActive(key)
        if (shouldStick) scrollToBottom()
      } catch {}
    }
    return ()=> ws.close()
  }, [active, stickBottom, aliases])

  // ao trocar de chat: sempre desce pro fim
  useEffect(() => { if (active) scrollToBottom() }, [active])

  // lista de chats (com busca)
  const chats: ChatItem[] = useMemo(()=>{
    const items = Object.entries(map).map(([key, arr]) => {
      const last = arr[arr.length-1]
      const any = arr[0]
      const name = displayName(any?.chatJID, any?.chatLID) || key
      const lastText = last?.text || (last?.media ? `[${last.media.kind}]` : '')
      return { jid: key, name, lastText, lastAt: last?.at, unread: 0 }
    })
    items.sort((a,b)=> (b.lastAt||0)-(a.lastAt||0))
    const q = search.trim().toLowerCase()
    return q ? items.filter(i => (i.name || i.jid).toLowerCase().includes(q)) : items
  }, [map, search])

  const msgs = map[active] || []

  // destino: se a conversa tiver JID, preferir JID; senão LID
  const resolveSendTo = () => {
    const arr = map[active] || []
    const any = arr[0]
    if (any?.chatJID) return any.chatJID
    if (any?.chatLID) return any.chatLID
    return active // fallback
  }

  const sendText = async (t:string) => {
    if(!active) return
    const to = resolveSendTo()
    await fetch(apiUrl('/messages/text'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to, text: t }) })
    setMap(prev => {
      const arr = prev[active] ? [...prev[active]] : []
      arr.push({
        id: 'local-'+Date.now(), chatKey: active,
        chatJID: isJid(to)?to:undefined, chatLID: isLid(to)?to:undefined,
        from: to, text: t, at: Date.now(), fromMe: true, status: 'sent'
      })
      return {...prev, [active]: arr}
    })
    scrollToBottom()
  }

  const uploadTo = async (path:string, file:File) => {
    const to = resolveSendTo()
    const fd = new FormData()
    fd.append('to', to)
    fd.append('file', file)
    await fetch(apiUrl(path), { method:'POST', body: fd })
    let kind:'image'|'video'|'audio'|'document' = 'document'
    if (path.includes('image')) kind='image'
    if (path.includes('video')) kind='video'
    if (path.includes('audio')) kind='audio'
    const dataURL = URL.createObjectURL(file)
    setMap(prev => {
      const arr = prev[active] ? [...prev[active]] : []
      arr.push({
        id: 'local-'+Date.now(), chatKey: active,
        chatJID: isJid(to)?to:undefined, chatLID: isLid(to)?to:undefined,
        from: to, text: '', at: Date.now(), fromMe: true, status: 'sent',
        media: kind==='document' ? { kind, dataURL, filename: file.name, mime: file.type } : { kind, dataURL, mime: file.type }
      })
      return {...prev, [active]: arr}
    })
    scrollToBottom()
  }

  const uploadImage = (f:File) => uploadTo('/messages/image', f)
  const uploadVideo = (f:File) => uploadTo('/messages/video', f)
  const uploadAudio = (f:File) => uploadTo('/messages/audio', f)
  const uploadDoc   = (f:File) => uploadTo('/messages/document', f)

  return (
    <div style={{display:'grid', gridTemplateColumns:'320px 1fr', height:'100%', minHeight:0}}>
      <ChatList items={chats} active={active} onSelect={(k)=>setActive(canonicalKey(k))} onSearch={setSearch}/>

      <section style={{display:'flex', flexDirection:'column', minWidth:0, minHeight:0}}>
        <header style={{padding:'10px 12px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:8, flex:'0 0 auto'}}>
          <div style={{width:32,height:32,borderRadius:6,background:'#e9eef5',display:'grid',placeItems:'center',fontSize:12}}>💬</div>
          <div style={{fontWeight:600}}>
            {(() => {
              const arr = map[active] || []
              const any = arr[0]
              return displayName(any?.chatJID, any?.chatLID) || active
            })()}
          </div>
          <div style={{marginLeft:'auto', fontSize:12, color:'#888'}}>conectado</div>
        </header>

        <div ref={messagesRef} style={{flex:'1 1 auto', minHeight:0, overflow:'auto', background:'#f5f6f8', padding:'8px 0'}}>
          {!active && <div style={{padding:24, color:'#888'}}>Escolha uma conversa na esquerda.</div>}
          {active && msgs.map(m =>
            <MessageBubble key={m.id} fromMe={m.fromMe} text={m.text} time={m.at} status={m.status} media={m.media}/>
          )}
        </div>

        <Composer
          onSend={sendText}
          onUploadImage={uploadImage}
          onUploadVideo={uploadVideo}
          onUploadAudio={uploadAudio}
          onUploadDoc={uploadDoc}
          disabled={!active}
        />
      </section>
    </div>
  )
}
