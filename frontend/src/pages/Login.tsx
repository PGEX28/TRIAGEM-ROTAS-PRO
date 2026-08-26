import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated, checkAuth } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      await checkAuth();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <Card className="auth-card animate-fade-in" glass>
        <div className="flex flex-col items-center justify-center mb-4">
          <img
            src="/app-icon.png"
            alt="Rotas Pro"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              margin: '0 auto 1.5rem',
              objectFit: 'cover',
              boxShadow: '0 0 25px rgba(249, 115, 22, 0.45)',
            }}
          />
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Bem-vindo ao Rotas Pro</h1>
          <p className="text-muted text-center" style={{ fontSize: '0.875rem' }}>
            Faça login para gerenciar suas triagens e pacotes.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ marginTop: '2rem' }}>
          {error && (
            <div className="mb-4" style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="mt-4" style={{ width: '100%' }} isLoading={loading}>
            Entrar
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OU ACESSO RÁPIDO</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>

          <Button
            type="button"
            variant="secondary"
            style={{ width: '100%' }}
            onClick={() => {
              useAuthStore.getState().setUser({
                id: '00000000-0000-0000-0000-000000000001',
                email: 'operador@rotaspro.com.br',
                role: 'admin',
                organization_id: '00000000-0000-0000-0000-000000000001',
              });
            }}
          >
            Entrar no Modo Demonstração (Sem Senha)
          </Button>
        </form>
      </Card>
    </div>
  );
};
