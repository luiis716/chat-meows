import React from 'react'

type MsgStatus = 'sent'|'delivered'|'read'|'played'
type Media = { kind:'image'|'video'|'audio'|'document', dataURL:string, mime?:string, filename?:string }

export const MessageBubble: React.FC<{
  fromMe?: boolean
  text?: string
  time?: number
  status?: MsgStatus
  media?: Media
}> = ({fromMe, text, time, status, media}) => {
  const ticks = fromMe
    ? status === 'read' || status === 'played' ? '✓✓'
      : status === 'delivered' ? '✓✓'
      : '✓'
    : ''

  const renderMedia = () => {
    if(!media) return null
    if(media.kind === 'image') return <img src={media.dataURL} style={{maxWidth:'100%', borderRadius:8}}/>
    if(media.kind === 'video') return <video src={media.dataURL} controls style={{maxWidth:'100%', borderRadius:8}}/>
    if(media.kind === 'audio') return <audio src={media.dataURL} controls />
    if(media.kind === 'document') return (
      <a href={media.dataURL} download={media.filename || 'arquivo'} style={{textDecoration:'none'}}>
        📄 {media.filename || 'Documento'} ({media.mime || ''})
      </a>
    )
    return null
  }

  return (
    <div style={{display:'flex', justifyContent: fromMe ? 'flex-end' : 'flex-start', padding:'2px 8px'}}>
      <div style={{maxWidth:'72%', background: fromMe ? '#d9fdd3' : '#fff',
                   border:'1px solid #e5e5e5', borderRadius:12, padding:'8px 10px',
                   boxShadow:'0 1px 1px rgba(0,0,0,0.03)'}}>
        {text && <div style={{whiteSpace:'pre-wrap', marginBottom: media ? 8 : 0}}>{text}</div>}
        {renderMedia()}
        <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end',
                     fontSize:11, color:'#888', marginTop:4}}>
          {time ? new Date(time).toLocaleTimeString() : ''}
          {fromMe && <span style={{opacity: status==='read'||status==='played'?1:0.6}}>{ticks}</span>}
        </div>
      </div>
    </div>
  )
}
