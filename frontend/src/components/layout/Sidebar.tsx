import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ScanLine,
  AlertCircle,
  History,
  ShieldCheck,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { signOut } = useAuthStore();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <img
            src="/app-icon.png"
            alt="Rotas Pro"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'cover',
              boxShadow: '0 0 12px rgba(249, 115, 22, 0.45)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
              ROTAS PRO
            </span>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px' }}>
              TRIAGEM E ROTEIRIZAÇÃO
            </span>
          </div>
        </div>

        {/* Botão de Fechar no Celular */}
        <button 
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Fechar Menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose} end>
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/bags" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Briefcase size={19} />
          <span>Sacos & Lotes</span>
        </NavLink>

        <NavLink to="/scanner" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <ScanLine size={19} />
          <span>Bipagem / Scanner</span>
        </NavLink>

        <NavLink to="/pending" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <AlertCircle size={19} />
          <span>Fila de Pendências</span>
        </NavLink>

        <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <History size={19} />
          <span>Histórico de Rotas</span>
        </NavLink>

        <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <ShieldCheck size={19} />
          <span>Auditoria</span>
        </NavLink>

        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.75rem 1rem' }} />

        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Settings size={19} />
          <span>Configurações</span>
        </NavLink>
      </nav>

      {/* Footer / User */}
      <div className="sidebar-footer">
        <button
          onClick={() => signOut()}
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <LogOut size={18} />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
};
