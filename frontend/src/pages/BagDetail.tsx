import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PackageList } from '../components/scanner/PackageList';
import { StopSummary } from '../components/scanner/StopSummary';
import { ImportModal } from '../components/scanner/ImportModal';
import { api } from '../lib/api';
import { CheckCircle, Package, ArrowLeft, UploadCloud, Trash2, Play, RotateCcw } from 'lucide-react';

import { audio } from '../services/audioService';

export const BagDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bag, setBag] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bagRes, pkgRes] = await Promise.all([
        api.get(`/bags/${id}`),
        api.get(`/packages/bag/${id}`)
      ]);
      setBag(bagRes.data);
      setPackages(pkgRes.data);
    } catch (error) {
      console.error('Failed to fetch bag details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleFinish = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await api.post(`/bags/${id}/finish`);
      audio.playFinishBag();
      fetchData();
    } catch (err: any) {
      audio.playError();
      alert(err.response?.data?.error || 'Erro ao finalizar saco');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await api.post(`/bags/${id}/reopen`, { reason: 'Reaberto pelo operador' });
      navigate(`/triage?bagId=${id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao reabrir saco');
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmDelete = window.confirm(`Deseja realmente excluir este saco "${bag?.code}" e todos os pacotes bipados nele?`);
    if (!confirmDelete) return;

    try {
      setActionLoading(true);
      await api.delete(`/bags/${id}`);
      navigate('/bags');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir saco');
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <Badge variant="warning">Aberto</Badge>;
      case 'IN_PROGRESS': return <Badge variant="primary">Em Triagem</Badge>;
      case 'REOPENED': return <Badge variant="warning">Reaberto</Badge>;
      case 'FINISHED': return <Badge variant="success">Finalizado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="spinner"></div></div>;
  }

  if (!bag) {
    return <div className="p-8 text-center text-danger">Saco não encontrado</div>;
  }

  const isFinished = bag?.status === 'FINISHED';

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="icon" onClick={() => navigate('/bags')} style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Button>
        <div style={{ flex: 1 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
            Detalhes do Saco: {bag.code}
            {getStatusBadge(bag.status)}
          </h1>
          <p className="text-muted" style={{ margin: 0, marginTop: '4px' }}>
            Criado em: {new Date(bag.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        
        <div className="flex gap-2">
          {!isFinished ? (
            <>
              <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
                <UploadCloud size={16} /> Importar Planilha
              </Button>
              <Button variant="primary" onClick={() => navigate(`/triage?bagId=${bag.id}`)}>
                <Play size={18} /> Continuar Bipagem
              </Button>
              <Button onClick={handleFinish} isLoading={actionLoading} variant="secondary">
                <CheckCircle size={18} /> Finalizar Saco
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleReopen}
                isLoading={actionLoading}
                title="Reabrir saco para adicionar ou editar pacotes"
              >
                <RotateCcw size={16} /> Reabrir / Continuar Bipagem
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const response = await api.get(`/export/bag/${bag.id}/circuit-csv`, { responseType: 'blob' });
                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    let cleanName = bag.code || 'saco';
                    if (cleanName.includes(' - ')) {
                      cleanName = cleanName.split(' - ').slice(1).join(' - ').trim();
                    }
                    cleanName = cleanName.replace(/[\/\\:*?"<>|]/g, '_').trim();
                    link.download = `${cleanName}.csv`;
                    link.click();
                  } catch (e) {
                    alert('Erro ao exportar CSV');
                  }
                }}
              >
                Exportar Circuit (CSV)
              </Button>
              <Button variant="primary" onClick={() => navigate(`/labels?bagId=${bag.id}`)}>
                <Package size={18} /> Ver / Imprimir Etiquetas
              </Button>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={handleDelete}
            isLoading={actionLoading}
            title="Excluir este saco"
            style={{ color: 'var(--danger)', borderColor: 'rgba(220, 38, 38, 0.3)' }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-muted text-sm font-semibold uppercase tracking-wider">Total Pacotes</span>
          <span className="text-3xl font-bold mt-2 text-primary">{bag.package_count}</span>
        </Card>
        
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-muted text-sm font-semibold uppercase tracking-wider">Paradas Agrupadas</span>
          <span className="text-3xl font-bold mt-2 text-success">{bag.stop_count}</span>
        </Card>

        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-muted text-sm font-semibold uppercase tracking-wider">Pacotes Pendentes</span>
          <span className="text-3xl font-bold mt-2 text-warning">{bag.pending_count}</span>
        </Card>

        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <span className="text-muted text-sm font-semibold uppercase tracking-wider">Duplicatas Rejeitadas</span>
          <span className="text-3xl font-bold mt-2 text-danger">{bag.duplicate_count}</span>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-6)' }}>
        <Card style={{ minHeight: '400px' }}>
          <CardHeader title="Histórico de Pacotes" />
          <PackageList packages={packages} />
        </Card>

        <Card style={{ minHeight: '400px' }}>
          <CardHeader title="Paradas de Entrega" />
          <StopSummary stops={bag.stops || []} />
        </Card>
      </div>

      {bag && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          bagId={bag.id}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
};
