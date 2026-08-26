import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AddressModal } from '../components/scanner/AddressModal';
import { api } from '../lib/api';
import { AlertCircle, CheckCircle, Edit, RefreshCw } from 'lucide-react';

export const Pending: React.FC = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      // Fetch active bags or pending packages
      const { data } = await api.get('/bags');
      const bagsList = data.data || [];
      
      const allPkgs: any[] = [];
      for (const bag of bagsList.slice(0, 5)) {
        const pkgRes = await api.get(`/packages/bag/${bag.id}`);
        const list = (pkgRes.data || []).filter((p: any) =>
          ['PENDING_REVIEW', 'ERROR', 'RECEIVED'].includes(p.status)
        ).map((p: any) => ({ ...p, bag_code: bag.code }));
        allPkgs.push(...list);
      }
      setPackages(allPkgs);
    } catch (err) {
      console.error('Erro ao buscar pendências:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleResolve = (pkg: any) => {
    setSelectedPkg(pkg);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Fila de Pendências
            <Badge variant={packages.length > 0 ? 'danger' : 'success'}>
              {packages.length} {packages.length === 1 ? 'pacote' : 'pacotes'}
            </Badge>
          </h1>
          <p>Pacotes com OCR de baixa confiança ou endereço incompleto aguardando revisão manual</p>
        </div>

        <Button variant="secondary" onClick={fetchPending} isLoading={loading}>
          <RefreshCw size={16} /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader title="Pacotes com Pendência de Informação" />

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="spinner"></div>
          </div>
        ) : packages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', backgroundColor: 'var(--success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={28} color="var(--success)" />
            </div>
            <h3>Tudo em dia!</h3>
            <p className="text-muted" style={{ marginTop: '4px' }}>
              Nenhum pacote pendente de revisão no momento.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Código de Barras</th>
                  <th>Saco</th>
                  <th>Status</th>
                  <th>Destinatário</th>
                  <th>Motivo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td style={{ fontWeight: 600 }}>{pkg.barcode}</td>
                    <td><Badge variant="primary">{pkg.bag_code}</Badge></td>
                    <td>
                      <Badge variant="warning">{pkg.status}</Badge>
                    </td>
                    <td>{pkg.recipient_name || <span className="text-muted">Não informado</span>}</td>
                    <td>
                      <div className="flex items-center gap-1 text-danger" style={{ fontSize: '0.8rem' }}>
                        <AlertCircle size={14} />
                        <span>Revisão de endereço necessária</span>
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        onClick={() => handleResolve(pkg)}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        <Edit size={14} /> Resolver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedPkg && (
        <AddressModal
          isOpen={!!selectedPkg}
          onClose={() => setSelectedPkg(null)}
          onSaved={() => {
            setSelectedPkg(null);
            fetchPending();
          }}
          packageId={selectedPkg.id}
          bagId={selectedPkg.bag_id}
        />
      )}
    </div>
  );
};
