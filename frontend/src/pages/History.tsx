import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Search, Eye, Download, Clock } from 'lucide-react';

export const History: React.FC = () => {
  const [bags, setBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/bags?limit=100');
      setBags(data.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredBags = bags.filter((b) =>
    b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.status && b.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportCsv = async (bagId: string, bagCode: string) => {
    try {
      const response = await api.get(`/export/bag/${bagId}/circuit-csv`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `circuit_${bagCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
      link.click();
    } catch (err) {
      alert('Erro ao baixar CSV da rota');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HistoryIcon className="text-primary" />
            Histórico de Operações
          </h1>
          <p>Consulte sacos processados, paradas formadas e exporte planilhas</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Sacos Arquivados e Processados"
          action={
            <div style={{ position: 'relative', width: '260px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por código ou status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="spinner"></div>
          </div>
        ) : filteredBags.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Nenhum registro encontrado.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Código do Saco</th>
                  <th>Status</th>
                  <th>Pacotes</th>
                  <th>Paradas</th>
                  <th>Data de Início</th>
                  <th>Finalizado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredBags.map((bag) => (
                  <tr key={bag.id}>
                    <td style={{ fontWeight: 700 }}>{bag.code}</td>
                    <td>
                      <Badge variant={bag.status === 'FINISHED' ? 'success' : bag.status === 'IN_PROGRESS' ? 'warning' : 'primary'}>
                        {bag.status}
                      </Badge>
                    </td>
                    <td>{bag.package_count || 0}</td>
                    <td>{bag.stop_count || 0}</td>
                    <td>
                      <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.8rem' }}>
                        <Clock size={12} />
                        {new Date(bag.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      {bag.finished_at ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(bag.finished_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/bags/${bag.id}`)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Eye size={14} /> Detalhes
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleExportCsv(bag.id, bag.code)}
                          title="Exportar CSV Circuit"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Download size={14} /> CSV
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
    </div>
  );
};
