import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell, LayoutDashboard, MessageSquare, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/exercise', label: 'Workout', icon: Dumbbell },
  { to: '/chat', label: 'AI Coach', icon: MessageSquare },
];

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'var(--neu-bg)',
        boxShadow: '0 4px 14px var(--neu-shadow-dark), 0 -2px 8px var(--neu-shadow-light)',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            className="neu-circle"
            style={{ width: 42, height: 42, padding: '8px' }}
          >
            <Dumbbell size={22} color="var(--accent)" />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Iron<span style={{ color: 'var(--accent)' }}>IQ</span>
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user && navItems.map(({ to, label, icon: Icon }) => {
          const isActive = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{ textDecoration: 'none' }}
            >
              <button
                className={`neu-btn${isActive ? ' active' : ''}`}
                style={{
                  padding: '8px 18px',
                  fontSize: '0.875rem',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            </Link>
          );
        })}
        
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px', gap: '12px' }}>
            <div className="neu-inset" style={{ padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
              <User size={16} color="var(--accent)" />
              {user.name}
            </div>
            <button onClick={handleLogout} className="neu-btn" style={{ padding: '8px', borderRadius: '50%' }} title="Logout">
              <LogOut size={18} color="var(--danger)" />
            </button>
          </div>
        ) : (
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <button className="neu-btn-accent neu-btn" style={{ padding: '8px 24px', fontSize: '0.9rem' }}>
              Sign In
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}
