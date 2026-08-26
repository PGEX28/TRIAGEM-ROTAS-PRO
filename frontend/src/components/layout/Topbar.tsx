import React from 'react';
import { Bell, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Topbar: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <header className="topbar">
      <div>
        {/* Placeholder for breadcrumbs or page title context */}
      </div>
      
      <div className="flex items-center gap-4">
        <button className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          <Bell size={20} />
        </button>
        
        <div className="flex items-center gap-2" style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--surface-glass)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} color="white" />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, paddingRight: '0.5rem' }}>
            {user?.email?.split('@')[0] || 'Usuário'}
          </span>
        </div>
      </div>
    </header>
  );
};
