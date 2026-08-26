import React, { useEffect, useState } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { Plus, Clock, Trash2, Play, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Bags: React.FC = () => {
  const [bags, setBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bagName, setBagName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchBags = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/bags');
      setBags(data.data || []);
    } catch (error) {
      console.error('Failed to fetch bags', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBags();
  }, []);

  const handleCreateBag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const { data } = await api.post('/bags', { name: bagName });
      setCreateModalOpen(false);
      setBagName('');
      // Redireciona diretamente para a tela de triagem/bipagem do novo saco
      navigate(`/triage?bagId=${data.id}`);
    } catch (error: any) {
      console.error('Failed to create bag', error);
      alert(error.response?.data?.error || 'Erro ao criar saco');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBag = async (bag: any) => {
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o saco "${bag.code}" e todos os seus pacotes bipados? Essa ação não pode ser desfeita.`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/bags/${bag.id}`);
      fetchBags();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir saco');
    }
  };

  const handleContinueTriage = async (bag: any) => {
    // Se o saco estava finalizado, reabrimos para permitir continuar a bipagem
    if (bag.status === 'FINISHED') {
      try {
        await api.post(`/bags/${bag.id}/reopen`, { reason: 'Continuar bipagem' });
      } catch (err) {
        console.warn('Erro ao reabrir saco:', err);
      }
    }
    navigate(`/triage?bagId=${bag.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">Aberto</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="primary">Em Triagem</Badge>;
      case 'REOPENED':
        return <Badge variant="warning">Reaberto</Badge>;
      case 'FINISHED':
        return <Badge variant="success">Finalizado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Sacos e Lotes de Entrega</h1>
          <p>Gerencie sacos de triagem, rotas abertas e lotes finalizados</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus size={18} /> Novo Saco de Triagem
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted">Carregando sacos...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Status</th>
                  <th>Pacotes</th>
                  <th>Paradas</th>
                  <th>Pendentes</th>
                  <th>Criação</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {bags.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">Nenhum saco encontrado</td>
                  </tr>
                ) : (
                  bags.map((bag) => (
                    <tr key={bag.id}>
                      <td style={{ fontWeight: 600 }}>{bag.code}</td>
                      <td>{getStatusBadge(bag.status)}</td>
                      <td><Badge variant="primary">{bag.package_count || 0}</Badge></td>
                      <td><Badge variant="success">{bag.stop_count || 0}</Badge></td>
                      <td>
                        {bag.pending_count > 0 ? (
                          <Badge variant="danger">{bag.pending_count}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-muted">
                          <Clock size={14} />
                          {new Date(bag.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="primary"
                            onClick={() => handleContinueTriage(bag)}
                            title="Bipar mais pacotes / Continuar Triagem"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Play size={13} />
                            {bag.status === 'FINISHED' ? 'Editar / Bipar' : 'Triagem'}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => navigate(`/bags/${bag.id}`)}
                            title="Ver detalhes, etiquetas e relatórios"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={13} />
                            Detalhes
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleDeleteBag(bag)}
                            title="Excluir este saco"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
                  O sistema gerará um código sequencial de hoje (ex: <code>#20260825-001</code>). Você pode atribuir um nome ou rota para facilitar a identificação.
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
