import React, { useRef, useState } from 'react'
import QRCode from 'qrcode'

export const Login: React.FC = () => {
  const [pair, setPair] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startQR = () => {
    const api = (import.meta as any).env.VITE_API_BASE
    const sse = new EventSource(api + '/auth/qr')

    sse.addEventListener('qr', async (e:any) => {
      const data = String(e.data || '')
      if (data === 'PAIRED') {
        setStatus('Aparelho já conectado ✔️')
        return
      }
      setStatus('Escaneie o QR pelo WhatsApp')
      if (canvasRef.current){
        await QRCode.toCanvas(canvasRef.current, data, { width: 256, margin:1 })
      }
    })

    sse.onopen = () => setStatus('Aguardando QR…')
    sse.onerror = (err) => {
      console.error('[SSE] erro', err)
      setStatus('Falha ao abrir SSE. Tente novamente.')
      sse.close()
    }
  }

  const getPair = async () => {
    const api = (import.meta as any).env.VITE_API_BASE
    const phone = prompt('Número do telefone (com DDI, ex: 55XXXXXXXXXX)?') || ''
    const r = await fetch(api + '/auth/paircode', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({phone})
    })
    const js = await r.json()
    setPair(js.code || js.error || 'erro')
  }

  return (
    <div style={{display:'flex', gap:24, padding:24}}>
      <div style={{border:'1px solid #eee', padding:16}}>
        <h3>Login via QR</h3>
        <canvas ref={canvasRef} width={256} height={256} style={{border:'1px solid #ddd'}}/>
        <div style={{marginTop:8, fontSize:12, color:'#666'}}>{status}</div>
        <div><button onClick={startQR} style={{marginTop:12}}>Gerar QR</button></div>
      </div>
      <div style={{border:'1px solid #eee', padding:16}}>
        <h3>Login via Pair Code</h3>
        <button onClick={getPair}>Gerar Pair Code</button>
        {pair && <pre style={{marginTop:12}}>{pair}</pre>}
      </div>
    </div>
  )
}
