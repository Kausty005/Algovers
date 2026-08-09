import { MessageSquare } from 'lucide-react';
import { Chatbot } from '../components/Chatbot';

export function ChatPage() {
  return (
    <div className="page-layout">
      <div
        className="container"
        style={{
          paddingTop: '40px',
          paddingBottom: '60px',
          maxWidth: '720px',
          height: 'calc(100vh - 70px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="neu-raised animate-fade-up"
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '20px',
            flexShrink: 0,
          }}
        >
          <div className="neu-circle" style={{ width: 48, height: 48 }}>
            <MessageSquare size={22} color="var(--accent)" />
          </div>
          <div>
            <h1 className="neu-heading" style={{ fontSize: '1.3rem' }}>IronIQ Coach</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Ask about exercises, form tips, or your workout progress
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-dot active" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Online</span>
          </div>
        </div>

        {/* Chatbot — fills remaining height */}
        <div className="animate-fade-up" style={{ flex: 1, minHeight: 0, animationDelay: '0.1s', animationFillMode: 'both' }}>
          <Chatbot />
        </div>
      </div>
    </div>
  );
}
