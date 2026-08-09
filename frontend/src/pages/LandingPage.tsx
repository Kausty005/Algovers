import { useNavigate } from 'react-router-dom';
import { Dumbbell, Zap, Brain, ShieldCheck, ChevronRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Dumbbell,
    title: 'Smart Rep Counting',
    desc: 'AI-powered computer vision tracks every rep with precision using MediaPipe pose detection.',
    color: 'var(--accent)',
  },
  {
    icon: Brain,
    title: 'Real-time AI Coaching',
    desc: 'Get instant form corrections and motivational guidance from your personal AI coach.',
    color: 'var(--success)',
  },
  {
    icon: Zap,
    title: 'Voice Feedback',
    desc: 'Hands-free audio coaching so you never have to look away from your workout.',
    color: 'var(--warning)',
  },
  {
    icon: ShieldCheck,
    title: 'x402 Pay-per-Session',
    desc: 'Powered by Algorand blockchain — pay only for the AI sessions you use.',
    color: 'var(--info)',
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="page-layout" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px 60px',
          textAlign: 'center',
          minHeight: '85vh',
        }}
      >
        {/* Logo mark */}
        <div
          className="neu-circle animate-fade-up"
          style={{
            width: 120,
            height: 120,
            marginBottom: '32px',
            boxShadow: 'var(--shadow-accent)',
          }}
        >
          <Dumbbell size={56} color="var(--accent)" />
        </div>

        <h1
          className="neu-heading animate-fade-up"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            marginBottom: '20px',
            lineHeight: 1.1,
          }}
        >
          Your AI-Powered
          <br />
          <span style={{ color: 'var(--accent)' }}>IronIQ</span>
        </h1>

        <p
          className="animate-fade-up"
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            maxWidth: '540px',
            lineHeight: 1.7,
            marginBottom: '40px',
          }}
        >
          Camera-based rep counting, real-time form analysis, AI coaching, and
          voice motivation — all powered by Algorand's x402 pay-per-use model.
        </p>

        <div
          className="animate-fade-up"
          style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <button
            className="neu-btn-accent neu-btn"
            style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: '14px' }}
            onClick={() => navigate('/exercise')}
          >
            Start Workout
            <ChevronRight size={20} />
          </button>
          <button
            className="neu-btn"
            style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: '14px', color: 'var(--text-secondary)' }}
            onClick={() => navigate('/dashboard')}
          >
            View Dashboard
          </button>
        </div>

        {/* Floating badge */}
        <div style={{ marginTop: '32px' }}>
          <span className="neu-badge" style={{ fontSize: '0.8rem', padding: '6px 16px' }}>
            🔗 Powered by Algorand x402
          </span>
        </div>
      </section>

      {/* Features grid */}
      <section
        style={{
          padding: '60px 24px',
          maxWidth: '1100px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <h2
          className="neu-heading"
          style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '10px' }}
        >
          Everything you need
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '48px',
          }}
        >
          No subscriptions, no bloat — train smarter with AI.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '24px',
          }}
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="neu-raised animate-fade-up"
                style={{
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  animationDelay: `${i * 0.1}s`,
                  animationFillMode: 'both',
                }}
              >
                <div
                  className="neu-circle"
                  style={{
                    width: 56,
                    height: 56,
                    boxShadow: `4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light), 0 0 14px ${f.color}35`,
                  }}
                >
                  <Icon size={26} color={f.color} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {f.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA bottom */}
      <section
        style={{
          padding: '60px 24px',
          textAlign: 'center',
        }}
      >
        <div
          className="neu-raised-lg"
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '48px 40px',
          }}
        >
          <h2 className="neu-heading" style={{ fontSize: '1.8rem', marginBottom: '14px' }}>
            Ready to train smarter?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.6 }}>
            Select your exercise and let IronIQ guide you through
            a perfectly tracked session.
          </p>
          <button
            className="neu-btn-accent neu-btn"
            style={{ padding: '16px 40px', fontSize: '1.05rem' }}
            onClick={() => navigate('/exercise')}
          >
            Get Started Free
            <ChevronRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
