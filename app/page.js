'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const money = n => '$' + Number(n).toLocaleString('es-CO')
const WA = '573005114631'
const STEPS = ['NUEVO', 'EN_COCINA', 'LISTO', 'DESPACHADO']

export default function Home() {
  const [products, setProducts] = useState([])
  const [extras, setExtras] = useState([])
  const [mesas, setMesas] = useState([])
  const [cart, setCart] = useState([])
  const [sel, setSel] = useState(null)
  const [checkout, setCheckout] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [order, setOrder] = useState(null)
  const [sure, setSure] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [p, e, m] = await Promise.all([
        supabase.from('products').select('*').order('sort'),
        supabase.from('extras').select('*').order('name'),
        supabase.from('mesas').select('*').order('n'),
      ])
      setProducts(p.data || []); setExtras(e.data || []); setMesas(m.data || [])
    })()
    setOrderId(localStorage.getItem('aslan_order'))
  }, [])

  // Seguimiento del pedido (consulta cada 4 s)
  useEffect(() => {
    if (!orderId) return
    let on = true
    const load = async () => {
      const { data } = await supabase.rpc('get_order', { p_id: orderId })
      if (on && data && data[0]) setOrder(data[0])
    }
    load()
    const t = setInterval(load, 4000)
    return () => { on = false; clearInterval(t) }
  }, [orderId])

  const count = cart.reduce((a, c) => a + c.qty, 0)
  const total = cart.reduce((a, c) => a + c.unit * c.qty, 0)
  const waText = encodeURIComponent(
    count
      ? 'Hola Aslan 👑, quiero pedir:\n' + cart.map(c => `• ${c.qty}x ${c.name}`).join('\n') + '\nTotal: ' + money(total)
      : 'Hola Aslan 👑, quiero hacer un pedido.'
  )

  async function cancel() {
    if (!sure) { setSure(true); return }
    await supabase.rpc('cancel_order', { p_id: orderId })
    setSure(false)
  }

  const idx = order ? STEPS.indexOf(order.status) : -1
  const last = order && order.tipo === 'Domicilio' ? 'En camino' : 'Entregado'

  return (
    <>
      <header>
        <div className="logo">👑 Aslan<small>FAST FOOD · EL SABOR QUE RUGE</small></div>
      </header>
      <main>
        {order && order.status === 'CANCELADO' && (
          <div className="card" style={{ marginBottom: 14 }}>
            <b>Pedido #{order.number} cancelado</b><br />
            <small className="mut">Puedes hacer un pedido nuevo cuando quieras.</small>
          </div>
        )}
        {order && order.status !== 'CANCELADO' && (
          <div className="card" style={{ marginBottom: 14 }}>
            <b>Pedido #{order.number}</b> · {money(order.total)}
            <div className="steps">
              {['Recibido', 'En cocina', 'Listo', last].map((s, k) => <div key={s} className={k <= idx ? 'on' : ''}>{s}</div>)}
            </div>
            {idx === 0 && (
              <button className="btn ghost" style={{ width: '100%', marginBottom: 8 }} onClick={cancel}>
                {sure ? '¿Seguro? Toca otra vez para cancelar' : 'Cancelar pedido'}
              </button>
            )}
            <small className="mut">
              {idx === 0 ? 'Esperando que cocina lo acepte…'
                : idx === 1 ? 'Estamos preparando tu pedido. Para cambios, escríbenos por WhatsApp.'
                : idx === 2 ? 'Tu pedido está listo.' : '¡Buen provecho!'}
            </small>
          </div>
        )}

        <h2>El sabor que ruge</h2>
        <div className="grid">
          {products.map(p => (
            <button key={p.id} className="card prod" disabled={!p.available} onClick={() => setSel(p)}>
              {p.image_url && <img className="ph" src={p.image_url} alt={p.name} />}
              <span className="nm">{p.name}</span>
              <span className="ds">{p.description}</span>
              <span className="pr">{p.available ? money(p.price) : 'Agotado'}</span>
            </button>
          ))}
        </div>
      </main>

      {count > 0 && (
        <div className="bar">
          <button className="btn" onClick={() => setCheckout(true)}>
            <span>Ver pedido ({count})</span><span>{money(total)}</span>
          </button>
        </div>
      )}

      <a className={'wa' + (count ? ' up' : '')} target="_blank" rel="noopener" aria-label="Pedir por WhatsApp"
         href={`https://wa.me/${WA}?text=${waText}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
      </a>

      {sel && <ProductSheet p={sel} extras={extras} onClose={() => setSel(null)}
                onAdd={item => { setCart([...cart, item]); setSel(null) }} />}
      {checkout && <Checkout cart={cart} setCart={setCart} mesas={mesas} onClose={() => setCheckout(false)}
                onDone={id => { localStorage.setItem('aslan_order', id); setOrderId(id); setOrder(null); setCart([]); setCheckout(false) }} />}
    </>
  )
}

function Sheet({ onClose, children }) {
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div>{children}</div>
    </div>
  )
}

function ProductSheet({ p, extras, onClose, onAdd }) {
  const [carne, setCarne] = useState(p.options ? p.options[0] : null)
  const [ex, setEx] = useState([])
  const chosen = extras.filter(e => ex.includes(e.id))
  const unit = p.price + chosen.reduce((a, e) => a + e.price, 0)
  const toggle = id => setEx(ex.includes(id) ? ex.filter(x => x !== id) : [...ex, id])
  return (
    <Sheet onClose={onClose}>
      {p.image_url && <img className="ph" src={p.image_url} alt={p.name} style={{ marginBottom: 12 }} />}
      <h2>{p.name}</h2>
      <p className="mut" style={{ margin: '-4px 0 12px' }}>{p.description}</p>
      {p.options && (<>
        <b>Tipo de carne</b>
        <div className="opt">{p.options.map(c => <button key={c} className={'chip' + (c === carne ? ' on' : '')} onClick={() => setCarne(c)}>{c}</button>)}</div>
      </>)}
      {p.allow_extras && (<>
        <b>Adiciones</b>
        <div className="opt">{extras.map(e => (
          <button key={e.id} disabled={!e.available} className={'chip' + (ex.includes(e.id) ? ' on' : '')} onClick={() => toggle(e.id)}>
            {e.name} +{money(e.price)}
          </button>))}
        </div>
      </>)}
      <div className="row">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn" onClick={() => onAdd({ product_id: p.id, name: p.name, carne, extras: ex,
          extraNames: chosen.map(e => e.name), unit, qty: 1 })}>Agregar · {money(unit)}</button>
      </div>
    </Sheet>
  )
}

function Checkout({ cart, setCart, mesas, onClose, onDone }) {
  const [tipo, setTipo] = useState('Domicilio')
  const [pago, setPago] = useState('Efectivo')
  const [nombre, setNombre] = useState('')
  const [dir, setDir] = useState('')
  const [mesa, setMesa] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const total = cart.reduce((a, c) => a + c.unit * c.qty, 0)

  async function send() {
    setErr('')
    if (!nombre.trim()) return setErr('Escribe tu nombre')
    if (tipo === 'Domicilio' && !dir.trim()) return setErr('Escribe tu dirección')
    if (tipo === 'Mesa' && !mesa) return setErr('Elige tu mesa')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_order', {
      p_name: nombre, p_tipo: tipo, p_address: tipo === 'Domicilio' ? dir : null,
      p_mesa: tipo === 'Mesa' ? mesa : null, p_pago: pago,
      p_items: cart.map(c => ({ product_id: c.product_id, carne: c.carne, extras: c.extras, qty: c.qty })),
    })
    setBusy(false)
    if (error) return setErr(error.message)
    onDone(data[0].order_id)
  }

  return (
    <Sheet onClose={onClose}>
      <h2>Tu pedido</h2>
      {cart.map((c, i) => (
        <div className="row" key={i}>
          <div><b>{c.qty}× {c.name}</b><br /><small className="mut">{[c.carne, ...c.extraNames].filter(Boolean).join(', ')}</small></div>
          <div>{money(c.unit * c.qty)} <button className="chip" aria-label="Quitar" onClick={() => setCart(cart.filter((_, k) => k !== i))}>✕</button></div>
        </div>
      ))}
      <label className="f">Nombre</label>
      <input className="t" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
      <b style={{ display: 'block', marginTop: 12 }}>Entrega</b>
      <div className="opt">{['Domicilio', 'Retiro', 'Mesa'].map(x => <button key={x} className={'chip' + (x === tipo ? ' on' : '')} onClick={() => setTipo(x)}>{x === 'Retiro' ? 'Retiro en local' : x}</button>)}</div>
      {tipo === 'Domicilio' && (<><label className="f">Dirección</label>
        <input className="t" value={dir} onChange={e => setDir(e.target.value)} placeholder="Calle, número, barrio" /></>)}
      {tipo === 'Mesa' && <div className="opt">{mesas.map(m => <button key={m.n} className={'chip' + (mesa === m.n ? ' on' : '')} onClick={() => setMesa(m.n)}>Mesa {m.n}</button>)}</div>}
      <b>Pago</b>
      <div className="opt">{['Efectivo', 'Nequi', 'Daviplata'].map(x => <button key={x} className={'chip' + (x === pago ? ' on' : '')} onClick={() => setPago(x)}>{x}</button>)}</div>
      <div className="row"><b>Total</b><b style={{ fontSize: 20 }}>{money(total)}</b></div>
      {err && <p style={{ color: 'var(--red)' }}>{err}</p>}
      <div className="row">
        <button className="btn ghost" onClick={onClose}>Seguir pidiendo</button>
        <button className="btn" disabled={busy || !cart.length} onClick={send}>{busy ? 'Enviando…' : 'Pedir ahora'}</button>
      </div>
    </Sheet>
  )
}
