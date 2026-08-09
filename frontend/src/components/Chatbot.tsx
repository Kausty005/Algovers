import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import type { ChatMessage } from '../types';
import { aiApi, mockAiApi } from '../services/aiApi';

const isDev = import.meta.env.DEV;

function genId() {
  return Math.random().toString(36).slice(2);
}

const STARTERS = [
  'What exercise should I do today?',
  'How can I improve my squat?',
  'Tips for better push-up form?',
  'How many reps should I aim for?',
];

export function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey! 👋 I'm IronIQ, your AI fitness coach. Ask me anything about your workout, form, or exercise plan!",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);
    const userMsg: ChatMessage = { id: genId(), role: 'user', content: text, timestamp: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const api = isDev ? mockAiApi : aiApi;
      const res = await api.chat({ message: text });
      const aiMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: res.response,
        timestamp: Date.now(),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '0',
      }}
    >
      {/* Messages */}
      <div
        className="neu-inset-lg"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          borderRadius: '20px',
          minHeight: 0,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="animate-fade-up"
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <div
              className="neu-circle"
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), #8b85ff)' : 'var(--neu-bg)',
              }}
            >
              {msg.role === 'user' ? (
                <User size={16} color="white" />
              ) : (
                <Bot size={16} color="var(--accent)" />
              )}
            </div>

            <div
              className={msg.role === 'user' ? 'neu-btn-accent neu-btn' : 'neu-raised'}
              style={{
                padding: '12px 16px',
                maxWidth: '75%',
                borderRadius: '16px',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'default',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="neu-circle" style={{ width: 36, height: 36 }}>
              <Bot size={16} color="var(--accent)" />
            </div>
            <div className="neu-raised" style={{ padding: '12px 16px', borderRadius: '16px' }}>
              <Loader size={16} color="var(--accent)" className="animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="neu-inset" style={{ padding: '12px 16px', borderRadius: '12px' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Starters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 0 8px' }}>
        {STARTERS.map((s) => (
          <button
            key={s}
            className="neu-btn"
            style={{ padding: '6px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
            onClick={() => send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          className="neu-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI coach anything…"
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          style={{ flex: 1 }}
        />
        <button
          className={`neu-btn${input.trim() ? '-accent ' : ' '}neu-btn`}
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{ width: 48, height: 48, borderRadius: '14px', padding: 0, flexShrink: 0 }}
        >
          <Send size={20} color={input.trim() ? 'white' : 'var(--text-secondary)'} />
        </button>
      </div>
    </div>
  );
}
