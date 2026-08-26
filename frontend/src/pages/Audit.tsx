import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { ShieldCheck, RefreshCw, Clock, FileText } from 'lucide-react';

export const Audit: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/audit?limit=100');
      setLogs(data.data || []);
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BAG_CREATED': return <Badge variant="primary">Saco Criado</Badge>;
      case 'BAG_FINISHED': return <Badge variant="success">Saco Finalizado</Badge>;
      case 'PACKAGE_SCANNED': return <Badge variant="primary">Pacote Bipado</Badge>;
      case 'PACKAGE_ADDRESSED': return <Badge variant="success">Endereço Vinculado</Badge>;
      case 'PRINT_JOB_QUEUED': return <Badge variant="warning">Impressão Enfileirada</Badge>;
      case 'BATCH_IMPORTED': return <Badge variant="primary">Lote Importado</Badge>;
      default: return <Badge>{action}</Badge>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck className="text-primary" />
            Trilha de Auditoria & Segurança
          </h1>
          <p>Rastreabilidade completa de todas as operações realizadas no sistema</p>
        </div>

        <Button variant="secondary" onClick={fetchLogs} isLoading={loading}>
          <RefreshCw size={16} /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader title="Logs de Auditoria Recentes" />

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="spinner"></div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Nenhum evento de auditoria registrado no momento.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>ID da Entidade</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.8rem' }}>
                        <Clock size={12} />
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {log.entity_type}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-glass)', padding: '2px 6px', borderRadius: '4px' }}>
                        {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '-'}
                      </code>
                    </td>
                    <td>
                      {log.new_data ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn-icon"
                          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        >
                          <FileText size={14} /> Ver Payload
                        </button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes do Payload */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '1rem' }}>
            <Card>
              <CardHeader title={`Detalhes do Evento: ${selectedLog.action}`} />
              <pre
                style={{
                  backgroundColor: '#0a0f1d',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  color: '#a5b4fc',
                  fontSize: '0.8rem',
                  overflowX: 'auto',
                  maxHeight: '300px',
                }}
              >
                {JSON.stringify(selectedLog.new_data || selectedLog, null, 2)}
              </pre>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                  Fechar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
