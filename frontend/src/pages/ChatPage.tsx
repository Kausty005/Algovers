import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Zap } from 'lucide-react';
import { Chatbot } from '../components/Chatbot';
import { AiModelModal } from '../components/AiModelModal';
import { paymentApi, mockPaymentApi } from '../services/paymentApi';
import { mockAiApi } from '../services/aiApi';

const isDev = import.meta.env.DEV;

export function ChatPage() {
  const [sessionId] = useState(() => 'chat-' + Math.random().toString(36).slice(2));
  const [credits, setCredits] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Show modal immediately if no credits
    if (credits <= 0) {
      setModalOpen(true);
    }
  }, [credits]);

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSuccess = (newCredits: number) => {
    setCredits(newCredits);
    setModalOpen(false);
  };

  return (
    <div className="page-layout">
      <AiModelModal
        open={modalOpen}
        sessionId={sessionId}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
      />

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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="neu-inset" style={{ padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--accent)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{credits} Credits</span>
            </div>
          </div>
        </div>

        {/* Chatbot — fills remaining height */}
        <div className="animate-fade-up" style={{ flex: 1, minHeight: 0, animationDelay: '0.1s', animationFillMode: 'both' }}>
          <Chatbot 
            sessionId={sessionId}
            onOutOfCredits={() => setModalOpen(true)}
            onCreditsUpdated={(c) => setCredits(c)}
          />
        </div>
      </div>
    </div>
  );
}
