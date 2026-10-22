import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const SERVICE_FEE_RATE = 0.05; // 5%

export default function Checkout() {
  const { bookingId } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState(null);
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvc: '' });
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/bookings/mine').then(r => {
      const b = r.data.find(x => x.id === Number(bookingId));
      if (!b) {
        nav('/');
        return;
      }
      setBooking(b);
    }).catch(() => {});
  }, [bookingId, nav]);

  if (!booking) return <p style={{ padding: 40 }}>Loading…</p>;

  // Backend stores total_price = subtotal + serviceFee
  const total = Number(booking.total_price);
  const subtotal = Math.round((total / (1 + SERVICE_FEE_RATE)) * 100) / 100;
  const serviceFee = Math.round((total - subtotal) * 100) / 100;

  const validateCard = () => {
    const num = card.number.replace(/\s/g, '');
    if (num.length < 12) return 'Card number too short';
    if (!/^\d+$/.test(num)) return 'Card number must be digits';
    if (!card.name.trim()) return 'Enter cardholder name';
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) return 'Expiry must be MM/YY';
    if (card.cvc.length < 3) return 'CVC must be at least 3 digits';
    return null;
  };

  const pay = async () => {
    setErr('');
    if (method === 'card') {
      const v = validateCard();
      if (v) return setErr(v);
    }
    setProcessing(true);
    
    // Slight delay for realism
    setTimeout(async () => {
      try {
        const r = await api.post('/payments', { booking_id: booking.id, method });
        setDone(r.data);
      } catch (e) {
        setErr(e.response?.data?.error || 'Payment failed');
      } finally {
        setProcessing(false);
      }
    }, 700);
  };

  if (done) {
    const p = done.payment;
    return (
      <div className="container section">
        <div className="pay-success">
          <h1>{done.confirmed ? '✅ Payment Confirmed' : '⏳ Awaiting Admin Verification'}</h1>
          <p><b>{p.method.toUpperCase()}</b> — Amount: <b>${p.amount}</b></p>
          <p>Reference: <code>{p.transaction_ref}</code></p>
          
          {done.serviceFee != null && (
            <p className="muted">Includes a service fee of <b>${done.serviceFee}</b>.</p>
          )}
          {!done.confirmed && (
            <p className="muted">Bank transfers are verified by the admin from the dashboard.</p>
          )}

          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => nav('/bookings')}>My Bookings</button>
            <button className="btn-ghost" onClick={() => nav('/')}>Browse more</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1>Checkout</h1>

      <div className="checkout-grid">
        {/* Booking Summary */}
        <div className="panel">
          <h3>Booking Summary</h3>
          <p><b>{booking.title}</b></p>
          <p className="muted">{booking.check_in} → {booking.check_out}</p>
          <p>Guests: {booking.guests}</p>
          <hr />
          <div style={{ fontSize: 14, lineHeight: 1.9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b93a5' }}>
              <span>Service fee (5%)</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <hr style={{ margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="panel">
          <h3>Payment method</h3>

          <div className="pay-methods">
            {[
              { id: 'card', label: '💳 Credit/Debit Card' },
              { id: 'paypal', label: '🅿 PayPal' },
              { id: 'bank_transfer', label: '🏦 Bank Transfer' }
            ].map(m => (
              <label key={m.id} className={`pay-option ${method === m.id ? 'active' : ''}`}>
                <input type="radio" name="pm" checked={method === m.id} onChange={() => setMethod(m.id)} />
                {m.label}
              </label>
            ))}
          </div>

          {method === 'card' && (
            <div className="card-form">
              <label>Card Number</label>
              <input placeholder="4242 4242 4242 4242" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} />
              <label>Cardholder Name</label>
              <input value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} />
              <div className="two">
                <div>
                  <label>Expiry (MM/YY)</label>
                  <input placeholder="12/28" value={card.exp} onChange={e => setCard({ ...card, exp: e.target.value })} />
                </div>
                <div>
                  <label>CVC</label>
                  <input placeholder="123" value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {method === 'paypal' && (
            <p className="muted">You will be redirected to PayPal (simulated) to complete payment.</p>
          )}

          {method === 'bank_transfer' && (
            <div className="bank-info">
              <p>Transfer the total to:</p>
              <p><b>Bank:</b> Demo Bank</p>
              <p><b>Account:</b> 1234567890</p>
              <p><b>Name:</b> RentEase Ltd</p>
              <p className="muted">After paying, click confirm below. Admin will verify your transfer.</p>
            </div>
          )}

          {err && <div className="error">{err}</div>}

          <button className="btn-primary full" onClick={pay} disabled={processing}>
            {processing ? 'Processing…' : `Pay $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}