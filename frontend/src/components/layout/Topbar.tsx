import React from 'react';
import { Bell, User, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface TopbarProps {
  onToggleMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMenu }) => {
  const { user } = useAuthStore();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button 
          className="mobile-menu-btn"
          onClick={onToggleMenu}
          aria-label="Abrir Menu"
        >
          <Menu size={22} />
        </button>
        <span className="mobile-brand-title">ROTAS PRO</span>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          <Bell size={18} />
        </button>
        
        <div className="flex items-center gap-2" style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--surface-glass)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={14} color="white" />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, paddingRight: '0.25rem' }}>
            {user?.email?.split('@')[0] || 'Usuário'}
          </span>
        </div>
      </div>
    </header>
  );
};
