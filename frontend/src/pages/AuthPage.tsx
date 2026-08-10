import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { User, Mail, Lock, Loader } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const res = await apiFetch<{ token: string; user: any }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        login(res.token, res.user);
        navigate('/dashboard');
      } else {
        const res = await apiFetch<{ token: string; user: any }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        });
        login(res.token, res.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="neu-raised-lg animate-fade-up" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? 'Log in to continue your fitness journey' : 'Sign up to start tracking your workouts'}
          </p>
        </div>

        {error && (
          <div className="neu-inset" style={{ padding: '12px', marginBottom: '24px', borderRadius: '8px', color: 'var(--danger)', textAlign: 'center', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <div className="neu-inset" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '12px' }}>
              <User size={20} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          <div className="neu-inset" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '12px' }}>
            <Mail size={20} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="neu-inset" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '12px' }}>
            <Lock size={20} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            type="submit"
            className="neu-btn-accent neu-btn"
            disabled={loading}
            style={{ padding: '14px', fontSize: '1rem', width: '100%', marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {loading ? <Loader className="animate-spin" size={20} /> : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
