'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const money = n => '$' + Number(n).toLocaleString('es-CO')
const NEXT = { NUEVO: 'EN_COCINA', EN_COCINA: 'LISTO', LISTO: 'DESPACHADO' }

export default function Panel() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (session === undefined) return null
  return session ? <Dashboard /> : <Login />
}

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  async function go(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setErr('Correo o contraseña incorrectos')
  }
  return (
    <main style={{ maxWidth: 380 }}>
      <h2>Panel Aslan</h2>
      <form onSubmit={go}>
        <label className="f">Correo</label>
        <input className="t" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
        <label className="f">Contraseña</label>
        <input className="t" type="password" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
        {err && <p style={{ color: 'var(--red)' }}>{err}</p>}
        <button className="btn" style={{ width: '100%', marginTop: 14 }}>Entrar</button>
      </form>
    </main>
  )
}

function Dashboard() {
  const [orders, setOrders] = useState([])
  const [mesas, setMesas] = useState([])
  const [products, setProducts] = useState([])
  const [extras, setExtras] = useState([])
  const [tab, setTab] = useState('ped')
  const [sound, setSound] = useState(true)
  const soundRef = useRef(true)
  const ctx = useRef(null)
  soundRef.current = sound

  function beep() {
    try {
      ctx.current = ctx.current || new (window.AudioContext || window.webkitAudioContext)()
      const c = ctx.current
      ;[0, 0.25, 0.5].forEach(t => {
        const o = c.createOscillator(), g = c.createGain()
        o.frequency.value = t === 0.25 ? 1040 : 780
        o.connect(g); g.connect(c.destination)
        g.gain.setValueAtTime(0.25, c.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.2)
        o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.22)
      })
    } catch (e) {}
  }

  async function load() {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    const [o, m, p, e] = await Promise.all([
      supabase.from('orders').select('*')
        .or(`created_at.gte.${d.toISOString()},status.in.(NUEVO,EN_COCINA,LISTO)`).order('created_at'),
      supabase.from('mesas').select('*').order('n'),
      supabase.from('products').select('*').order('sort'),
      supabase.from('extras').select('*').order('name'),
    ])
    setOrders(o.data || []); setMesas(m.data || []); setProducts(p.data || []); setExtras(e.data || [])
  }

  useEffect(() => {
    // El navegador solo permite sonido después de un toque en la página
    const unlock = () => { ctx.current = ctx.current || new (window.AudioContext || window.webkitAudioContext)() }
    window.addEventListener('pointerdown', unlock, { once: true })
    load()
    const ch = supabase.channel('aslan-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, pl => {
        if (pl.eventType === 'INSERT' && soundRef.current) beep()
        load()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch); window.removeEventListener('pointerdown', unlock) }
  }, [])

  const advance = o => supabase.from('orders').update({ status: NEXT[o.status] }).eq('id', o.id).then(load)
  const toggleMesa = m => supabase.from('mesas').update({ occupied: !m.occupied }).eq('n', m.n).then(load)
  const toggleProd = p => supabase.from('products').update({ available: !p.available }).eq('id', p.id).then(load)
  const toggleExtra = e => supabase.from('extras').update({ available: !e.available }).eq('id', e.id).then(load)

  const done = orders.filter(o => o.status === 'DESPACHADO')
  const sales = done.reduce((a, o) => a + o.total, 0)
  const active = orders.filter(o => NEXT[o.status])

  const Col = ({ st, title, btn }) => {
    const list = orders.filter(o => o.status === st)
    return (
      <div className="col">
        <h3>{title}<span>{list.length}</span></h3>
        {list.length === 0 && <small className="mut">Sin pedidos</small>}
        {list.map(o => (
          <div key={o.id} className={'card tk' + (st === 'NUEVO' ? ' n' : '')}>
            <b>#{o.number} · {o.customer_name}</b><br />
            <small>{o.tipo === 'Mesa' ? 'Mesa ' + o.mesa : o.tipo}{o.address ? ' · ' + o.address : ''} · {o.pago} · {money(o.total)}</small>
            <ul>{o.items.map((c, i) => (
              <li key={i}>{c.qty}× {c.name} <small>{[c.carne, ...(c.extras || [])].filter(Boolean).length ? '(' + [c.carne, ...(c.extras || [])].filter(Boolean).join(', ') + ')' : ''}</small></li>
            ))}</ul>
            <button className="btn" style={{ width: '100%' }} onClick={() => advance(o)}>{typeof btn === 'function' ? btn(o) : btn}</button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <header>
        <div className="logo">👑 Aslan<small>PANEL DEL RESTAURANTE</small></div>
        <button className="chip" onClick={() => supabase.auth.signOut()}>Salir</button>
      </header>
      <main>
        <div className="stats">
          <div className="card"><b>{money(sales)}</b><span className="mut">Ventas del turno</span></div>
          <div className="card"><b>{done.length}</b><span className="mut">Pedidos atendidos</span></div>
          <div className="card"><b>{active.length}</b><span className="mut">En curso</span></div>
        </div>
        <div className="sub">
          {[['ped', 'Pedidos'], ['mes', 'Mesas'], ['men', 'Menú']].map(([k, l]) => (
            <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>))}
          <button className={'chip' + (sound ? ' on' : '')} onClick={() => { setSound(!sound); if (!sound) beep() }}>
            🔔 Sonido {sound ? 'activo' : 'apagado'}</button>
        </div>

        {tab === 'ped' && (
          <div className="cols">
            <Col st="NUEVO" title="Pendientes" btn="Aceptar" />
            <Col st="EN_COCINA" title="En preparación" btn="Marcar listo" />
            <Col st="LISTO" title="Listos para despacho" btn={o => o.tipo === 'Domicilio' ? 'Enviar (en camino)' : 'Entregar'} />
          </div>
        )}
        {tab === 'mes' && (<>
          <h2>Salón</h2>
          <div className="mesas">{mesas.map(m => (
            <button key={m.n} className={m.occupied ? 'oc' : ''} onClick={() => toggleMesa(m)}>
              Mesa {m.n}<br /><small>{m.occupied ? 'Ocupada' : 'Libre'}</small></button>))}</div>
        </>)}
        {tab === 'men' && (<>
          <h2>Disponibilidad</h2>
          <div className="card">
            {products.map(p => (
              <div className="row" key={p.id}><span>{p.name}</span>
                <button className={'chip' + (p.available ? ' on' : '')} onClick={() => toggleProd(p)}>{p.available ? 'Disponible' : 'Agotado'}</button></div>))}
            <hr style={{ border: 0, borderTop: '1px solid var(--line)' }} />
            {extras.map(e => (
              <div className="row" key={e.id}><span>{e.name}</span>
                <button className={'chip' + (e.available ? ' on' : '')} onClick={() => toggleExtra(e)}>{e.available ? 'Disponible' : 'Agotado'}</button></div>))}
          </div>
        </>)}
      </main>
    </>
  )
}
