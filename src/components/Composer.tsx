import React, { useRef, useState } from 'react'

export const Composer: React.FC<{
  onSend:(t:string)=>void
  onUploadImage:(file:File)=>void
  onUploadVideo:(file:File)=>void
  onUploadAudio:(file:File)=>void
  onUploadDoc:(file:File)=>void
  disabled?:boolean
}> = ({onSend, onUploadImage, onUploadVideo, onUploadAudio, onUploadDoc, disabled}) => {
  const [text, setText] = useState('')
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const audRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const submit = () => { if(!text.trim()) return; onSend(text); setText('') }
  const onKey = (e:React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); submit() }
  }

  const pick = (ref:React.RefObject<HTMLInputElement>) => ref.current?.click()
  const choose = (kind:'img'|'vid'|'aud'|'doc') => (e:React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if(!f) return
    if(kind==='img') onUploadImage(f)
    if(kind==='vid') onUploadVideo(f)
    if(kind==='aud') onUploadAudio(f)
    if(kind==='doc') onUploadDoc(f)
    e.currentTarget.value = ''
  }

  return (
    <div style={{display:'flex', gap:8, padding:10, borderTop:'1px solid #eee'}}>
      <button title="Imagem" onClick={()=>pick(imgRef)} disabled={disabled}>📷</button>
      <button title="Vídeo" onClick={()=>pick(vidRef)} disabled={disabled}>🎬</button>
      <button title="Áudio (PTT)" onClick={()=>pick(audRef)} disabled={disabled}>🎤</button>
      <button title="Documento" onClick={()=>pick(docRef)} disabled={disabled}>📄</button>

      <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={choose('img')}/>
      <input ref={vidRef} type="file" accept="video/*" style={{display:'none'}} onChange={choose('vid')}/>
      <input ref={audRef} type="file" accept="audio/ogg,audio/opus" style={{display:'none'}} onChange={choose('aud')}/>
      <input ref={docRef} type="file" style={{display:'none'}} onChange={choose('doc')}/>

      <textarea rows={2} style={{flex:1}} placeholder="Digite uma mensagem"
                value={text} onChange={e=>setText(e.target.value)}
                onKeyDown={onKey} disabled={disabled}/>
      <button onClick={submit} disabled={disabled || !text.trim()}>Enviar</button>
    </div>
  )
}
