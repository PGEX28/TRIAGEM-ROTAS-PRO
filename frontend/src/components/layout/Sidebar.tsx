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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Sidebar: React.FC = () => {
  const { signOut } = useAuthStore();

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <img
          src="/app-icon.png"
          alt="Rotas Pro"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            objectFit: 'cover',
            boxShadow: '0 0 12px rgba(249, 115, 22, 0.45)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            ROTAS PRO
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px' }}>
            TRIAGEM E ROTEIRIZAÇÃO
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/bags" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Briefcase size={19} />
          <span>Sacos & Lotes</span>
        </NavLink>

        <NavLink to="/scanner" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ScanLine size={19} />
          <span>Bipagem / Scanner</span>
        </NavLink>

        <NavLink to="/pending" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <AlertCircle size={19} />
          <span>Fila de Pendências</span>
        </NavLink>

        <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <History size={19} />
          <span>Histórico de Rotas</span>
        </NavLink>

        <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShieldCheck size={19} />
          <span>Auditoria</span>
        </NavLink>

        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.75rem 1rem' }} />

        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
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
