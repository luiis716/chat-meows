import React, { useState } from 'react'
import { Login } from './Login'
import { Inbox } from './Inbox'

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'login'|'inbox'>('inbox')
  return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column', minHeight:0}}>
      <header style={{padding:10, borderBottom:'1px solid #eee', display:'flex', gap:8, alignItems:'center'}}>
        <b>CRM</b>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <button onClick={()=>setScreen('login')}>Login</button>
          <button onClick={()=>setScreen('inbox')}>Inbox</button>
        </div>
      </header>
      {/* minHeight:0 aqui é importante pro flex permitir overflow interno */}
      <div style={{flex:1, minHeight:0}}>
        {screen==='login' ? <Login/> : <Inbox/>}
      </div>
    </div>
  )
}
