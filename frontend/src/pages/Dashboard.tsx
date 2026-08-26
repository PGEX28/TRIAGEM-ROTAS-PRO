import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Briefcase,
  MapPin,
  AlertCircle,
  Printer,
  TrendingUp,
  Plus,
  Play,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardStats {
  bags_today: number;
  packages_today: number;
  stops_today: number;
  pending_today: number;
  printed_today: number;
}

const STATUS_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBags, setRecentBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bagName, setBagName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, bagsRes] = await Promise.all([
        api.get('/bags/stats').catch(() => ({ data: null })),
        api.get('/bags?limit=6').catch(() => ({ data: { data: [] } })),
      ]);

      setStats(statsRes.data || {
        bags_today: 0,
        packages_today: 0,
        stops_today: 0,
        pending_today: 0,
        printed_today: 0,
      });

      setRecentBags(bagsRes.data?.data || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const { data } = await api.post('/bags', { name: bagName });
      setCreateModalOpen(false);
      setBagName('');
      navigate(`/triage?bagId=${data.id}`);
    } catch (error: any) {
      console.error('Erro ao criar saco:', error);
      alert(error.response?.data?.error || 'Erro ao criar saco');
    } finally {
      setCreating(false);
    }
  };

  // Gráfico de Tendência Horária simulada/estruturada baseada nos totais de hoje
  const hourlyData = [
    { hour: '07:00', pacotes: Math.round((stats?.packages_today || 0) * 0.05), paradas: Math.round((stats?.stops_today || 0) * 0.05) },
    { hour: '08:00', pacotes: Math.round((stats?.packages_today || 0) * 0.15), paradas: Math.round((stats?.stops_today || 0) * 0.12) },
    { hour: '09:00', pacotes: Math.round((stats?.packages_today || 0) * 0.35), paradas: Math.round((stats?.stops_today || 0) * 0.30) },
    { hour: '10:00', pacotes: Math.round((stats?.packages_today || 0) * 0.60), paradas: Math.round((stats?.stops_today || 0) * 0.55) },
    { hour: '11:00', pacotes: Math.round((stats?.packages_today || 0) * 0.85), paradas: Math.round((stats?.stops_today || 0) * 0.80) },
    { hour: 'Agora', pacotes: stats?.packages_today || 0, paradas: stats?.stops_today || 0 },
  ];

  // Gráfico de Pizza / Distribuição
  const pieData = stats
    ? [
        { name: 'Impressos', value: stats.printed_today || 0 },
        { name: 'Triados', value: Math.max(0, (stats.packages_today || 0) - (stats.printed_today || 0) - (stats.pending_today || 0)) },
        { name: 'Pendentes', value: stats.pending_today || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const consolidationRate = stats && stats.stops_today > 0
    ? (stats.packages_today / stats.stops_today).toFixed(1)
    : '1.0';

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header Principal do Centro de Comando */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--primary)' }}>
              CENTRO DE COMANDO OPERACIONAL
            </span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Painel de Triagem & Logística</h1>
          <p style={{ margin: 0, marginTop: '2px', fontSize: '0.875rem' }}>
            Visão consolidada da operação de triagem, agrupamento de paradas e expedição
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/pending')}>
            <AlertCircle size={16} /> Fila de Pendências
          </Button>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={18} /> Iniciar Novo Saco
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '3px' }} />
        </div>
      ) : (
        <>
          {/* Grid de Métricas Principais (Cards com Indicadores) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {/* 1. Sacos Criados */}
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, var(--surface) 100%)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Sacos Hoje</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {stats?.bags_today || 0}
                  </div>
                  <div className="flex items-center gap-1 text-primary mt-2" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <Briefcase size={12} />
                    <span>Lotes de triagem</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--primary-glow)', borderRadius: 'var(--radius-md)' }}>
                  <Layers color="var(--primary)" size={22} />
                </div>
              </div>
            </Card>

            {/* 2. Pacotes Lidos */}
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--surface) 100%)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Pacotes Bipados</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {stats?.packages_today || 0}
                  </div>
                  <div className="flex items-center gap-1 text-success mt-2" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <TrendingUp size={12} />
                    <span>Processados</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}>
                  <Package color="var(--success)" size={22} />
                </div>
              </div>
            </Card>

            {/* 3. Paradas Agrupadas */}
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, var(--surface) 100%)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Paradas Formadas</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {stats?.stops_today || 0}
                  </div>
                  <div className="flex items-center gap-1 text-warning mt-2" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <Sparkles size={12} />
                    <span>Média {consolidationRate} pct/parada</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-md)' }}>
                  <MapPin color="var(--warning)" size={22} />
                </div>
              </div>
            </Card>

            {/* 4. Etiquetas Impressas */}
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, var(--surface) 100%)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Etiquetas Térmicas</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {stats?.printed_today || 0}
                  </div>
                  <div className="flex items-center gap-1 mt-2" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                    <Printer size={12} />
                    <span>Prontas para entrega</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}>
                  <Printer color="var(--accent)" size={22} />
                </div>
              </div>
            </Card>

            {/* 5. Pendências */}
            <Card
              style={{
                background: stats && stats.pending_today > 0
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, var(--surface) 100%)'
                  : 'var(--surface)',
                borderColor: stats && stats.pending_today > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Pendências OCR</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: stats && stats.pending_today > 0 ? 'var(--danger)' : 'var(--text-primary)', lineHeight: 1 }}>
                    {stats?.pending_today || 0}
                  </div>
                  <div className="flex items-center gap-1 text-muted mt-2" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <AlertCircle size={12} />
                    <span>{stats && stats.pending_today > 0 ? 'Requer atenção' : 'Sem pendências'}</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}>
                  <AlertCircle color="var(--danger)" size={22} />
                </div>
              </div>
            </Card>
          </div>

          {/* Gráficos de Vazão e Distribuição */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
            {/* Gráfico de Área - Vazão de Triagem */}
            <Card>
              <CardHeader
                title="Curva de Triagem e Agrupamento"
                action={<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Operação de Hoje</span>}
              />
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPacotes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorParadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="hour" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                    <Area type="monotone" dataKey="pacotes" name="Pacotes Bipados" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPacotes)" />
                    <Area type="monotone" dataKey="paradas" name="Paradas Formadas" stroke="var(--success)" strokeWidth={2} fillOpacity={1} fill="url(#colorParadas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Gráfico de Pizza - Status dos Pacotes */}
            <Card>
              <CardHeader title="Distribuição do Dia" />
              <div style={{ height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pieData.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Aguardando primeiros bips...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Tabela de Sacos Recentes e Ações Rápidas */}
          <Card>
            <CardHeader
              title="Sacos em Andamento e Recentes"
              action={
                <Button variant="secondary" onClick={() => navigate('/bags')} style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
                  Ver Todos os Sacos <ArrowRight size={14} />
                </Button>
              }
            />

            {recentBags.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                Nenhum saco criado ainda hoje. Clique em <strong>"Iniciar Novo Saco"</strong> acima para começar!
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Status</th>
                      <th>Pacotes</th>
                      <th>Paradas</th>
                      <th>Início</th>
                      <th>Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBags.map((bag) => (
                      <tr key={bag.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{bag.code}</td>
                        <td>
                          <Badge variant={bag.status === 'FINISHED' ? 'success' : bag.status === 'IN_PROGRESS' ? 'warning' : 'primary'}>
                            {bag.status === 'FINISHED' ? 'Finalizado' : bag.status === 'IN_PROGRESS' ? 'Em Triagem' : 'Aberto'}
                          </Badge>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{bag.package_count || 0}</span> pacotes
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{bag.stop_count || 0}</span> paradas
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.8rem' }}>
                            <Clock size={12} />
                            {new Date(bag.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {bag.status !== 'FINISHED' ? (
                              <Button
                                variant="primary"
                                onClick={() => navigate(`/triage?bagId=${bag.id}`)}
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              >
                                <Play size={13} /> Triar
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                onClick={() => navigate(`/labels?bagId=${bag.id}`)}
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              >
                                <Printer size={13} /> Etiquetas
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/bags/${bag.id}`)}
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Detalhes
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Modal de Criação de Saco com Nome/Designação */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '1rem' }}>
            <Card>
              <CardHeader title="Abrir Novo Saco de Triagem" />
              <form onSubmit={handleCreateBag}>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  O sistema gerará um código sequencial de hoje (ex: <code>#20260825-001</code>). Você pode atribuir um nome ou rota para designar o lote.
                </p>

                <div className="form-group">
                  <label className="form-label">Nome / Rota / Designação (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Rota Sul - Campeche, Van 04, Lote Shopee..."
                    value={bagName}
                    onChange={(e) => setBagName(e.target.value)}
                    autoFocus
                    style={{ width: '100%', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={creating}>
                    <Plus size={16} /> Iniciar Bipagem
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
