import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/useAuth';
import { getSocket } from '../socket';

export default function Chat() {
  const { userId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [convos, setConvos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const loadConvos = useCallback(() => {
    api.get('/messages/conversations')
      .then(r => setConvos(r.data))
      .catch(() => {});
  }, []);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) loadConvos();
    })();
    return () => { cancelled = true; };
  }, [user, loadConvos]);

  // Load messages for a selected conversation
  useEffect(() => {
    if (!userId) {
      // Defer the setState so it's not sync in the effect body
      const t = setTimeout(() => setMessages([]), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    api.get(`/messages/${userId}`)
      .then(r => { if (!cancelled) setMessages(r.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  // Real-time incoming messages
  useEffect(() => {
    const s = getSocket();
    if (!s || !user) return;

    const onNew = (m) => {
      if (
        (m.sender_id === Number(userId) && m.receiver_id === user.id) ||
        (m.sender_id === user.id && m.receiver_id === Number(userId))
      ) {
        setMessages(prev => [...prev, m]);
      }
      loadConvos();
    };

    s.on('message:new', onNew);
    return () => s.off('message:new', onNew);
  }, [userId, user, loadConvos]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !userId) return;
    try {
      await api.post('/messages', {
        receiver_id: Number(userId),
        content: text
      });
      setText('');
    } catch (err) {
      console.error('Send failed', err);
    }
  };

  return (
    <div className="container">
      <aside className="chat-side">
        <h3>Conversations</h3>
        {convos.length === 0 && <p className="muted">No conversations yet.</p>}
        {convos.map(c => (
          <div
            key={c.user_id}
            className={`convo ${Number(userId) === c.user_id ? 'active' : ''}`}
            onClick={() => nav(`/chat/${c.user_id}`)}
          >
            <b>{c.username}</b>
            <div className="muted small">
              {c.last_message?.slice(0, 40)}
            </div>
          </div>
        ))}
      </aside>

      <main className="chat-main">
        {!userId ? (
          <p className="muted" style={{ padding: 20 }}>
            Select a conversation, or open a property and click "Message owner".
          </p>
        ) : (
          <>
            <div className="chat-messages">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`msg ${m.sender_id === user?.id ? 'mine' : 'theirs'}`}
                >
                  <div className="msg-content">{m.content}</div>
                  <div className="msg-time">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form className="chat-input" onSubmit={send}>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type a message…"
              />
              <button className="btn-primary" type="submit">Send</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}