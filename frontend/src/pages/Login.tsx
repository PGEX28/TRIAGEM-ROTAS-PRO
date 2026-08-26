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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OU</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>

          <Button
            type="button"
            variant="secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              fontWeight: 500,
            }}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin,
                  },
                });
                if (error) throw error;
              } catch (err: any) {
                setError(err.message || 'Erro ao conectar com Google');
                setLoading(false);
              }
            }}
          >
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Entrar com Google
          </Button>

          <Button
            type="button"
            variant="secondary"
            style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}
            onClick={() => {
              useAuthStore.getState().setUser({
                id: '00000000-0000-0000-0000-000000000001',
                email: 'operador@rotaspro.com.br',
                role: 'admin',
                organization_id: '00000000-0000-0000-0000-000000000001',
              });
            }}
          >
            Modo Demonstração (Sem Senha)
          </Button>
        </form>
      </Card>
    </div>
  );
};
