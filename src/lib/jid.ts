export function isLid(id: string) {
  return typeof id === 'string' && /@lid$/i.test(id)
}
export function isJid(id: string) {
  return typeof id === 'string' && /@s\.whatsapp\.net$/i.test(id)
}
export function prettyJid(id: string) {
  if (!id) return id
  if (isJid(id)) return id.replace('@s.whatsapp.net', '')
  if (id.endsWith('@g.us')) return id.replace('@g.us', '')
  return id
}

/** Decide a “chave da conversa” obedecendo prioridade JID > LID */
export function pickChatKey(chatJID?: string, chatLID?: string) {
  if (chatJID) return chatJID
  if (chatLID) return chatLID
  return ''
}

/** Nome para UI: preferir JID, senão LID (marcando como LID) */
export function displayName(chatJID?: string, chatLID?: string) {
  if (chatJID) return prettyJid(chatJID)
  if (chatLID) return prettyJid(chatLID) + ' (LID)'
  return ''
}
