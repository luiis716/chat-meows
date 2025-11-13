// tenta detectar "fromMe" em diferentes formatos de evento
export function isFromMe(ev:any): boolean {
  if (ev?.info?.isFromMe !== undefined) return !!ev.info.isFromMe
  if (ev?.Info?.IsFromMe !== undefined) return !!ev.Info.IsFromMe
  if (ev?.key?.fromMe !== undefined) return !!ev.key.fromMe
  if (ev?.Key?.FromMe !== undefined) return !!ev.Key.FromMe
  return false
}

export function messageText(ev:any): string {
  const m = ev?.message || ev?.Message
  if (!m) return ''
  if (m.conversation) return m.conversation
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text
  if (m.ExtendedTextMessage?.Text) return m.ExtendedTextMessage.Text
  return ''
}

export function messageTimestamp(ev:any): number {
  const ts = ev?.timestamp || ev?.Timestamp || ev?.info?.timestamp || ev?.Info?.Timestamp
  if (!ts) return Date.now()
  if (typeof ts === 'number') return ts*1000 < 1e12 ? ts*1000 : ts
  const n = Number(ts); if(!Number.isNaN(n)) return n
  return Date.parse(ts) || Date.now()
}

export function messageChatJid(ev:any): string {
  return ev?.chat || ev?.Chat || ev?.info?.chat || ev?.Info?.Chat || ev?.key?.remoteJid || ev?.Key?.RemoteJID || ''
}

export function messageSenderJid(ev:any): string {
  return ev?.sender || ev?.Sender || ev?.info?.sender || ev?.Info?.Sender || ev?.key?.participant || ev?.Key?.Participant || ev?.key?.from || ''
}

export function messageId(ev:any): string {
  // tipos comuns do whatsmeow: Info.ID ou Key.ID
  return ev?.info?.id || ev?.Info?.ID || ev?.key?.id || ev?.Key?.ID || ev?.message?.key?.id || ''
}

/** heurística: é um evento de "receipt" (entregue/lido/played), não mensagem */
export function isReceipt(ev:any): boolean {
  // events.Receipt tem campos: IDs, Type, Chat, Sender...
  const ids = ev?.IDs || ev?.ids
  const typ = ev?.Type || ev?.type
  return Array.isArray(ids) && (typ !== undefined)
}

export function receiptIds(ev:any): string[] {
  const ids = ev?.IDs || ev?.ids || []
  return Array.isArray(ids) ? ids.map(String) : []
}

export function receiptType(ev:any): 'delivered'|'read'|'played'|'other' {
  const t = String(ev?.Type || ev?.type || '').toLowerCase()
  if (t.includes('read')) return 'read'
  if (t.includes('played')) return 'played'
  if (t.includes('deliver')) return 'delivered'
  // pode vir como número; trate como other
  return 'other'
}

/** presença/typing etc -> ignorar na UI */
export function isPresence(ev:any): boolean {
  return ev?.Presence !== undefined || ev?.presence !== undefined
}
