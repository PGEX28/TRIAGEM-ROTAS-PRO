import React from 'react';
import { Badge } from '../ui/Badge';

interface PackageListProps {
  packages: any[];
}

export const PackageList: React.FC<PackageListProps> = ({ packages }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED': return <Badge variant="primary">Recebido</Badge>;
      case 'IDENTIFIED': return <Badge variant="success">Identificado</Badge>;
      case 'PENDING_REVIEW': return <Badge variant="warning">Revisão</Badge>;
      case 'CONFIRMED': return <Badge variant="success">Confirmado</Badge>;
      case 'DUPLICATE': return <Badge variant="danger">Duplicado</Badge>;
      case 'ERROR': return <Badge variant="danger">Erro</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: '80px', textAlign: 'center' }}>ORDEM</th>
            <th>Código / Rastreio</th>
            <th>Destinatário</th>
            <th>Parada</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg, index) => {
            const orderNum = pkg.stop?.order_number || (index + 1);
            return (
              <tr key={pkg.id}>
                <td style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '42px',
                      height: '36px',
                      backgroundColor: 'rgba(249, 115, 22, 0.15)',
                      border: '2px solid #f97316',
                      color: '#f97316',
                      borderRadius: '8px',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      lineHeight: 1,
                      boxShadow: '0 0 10px rgba(249, 115, 22, 0.25)',
                    }}
                  >
                    {String(orderNum).padStart(2, '0')}
                  </div>
                </td>
                <td style={{ fontWeight: 600, fontSize: '0.95rem' }}>{pkg.barcode}</td>
                <td>{pkg.recipient_name || <span className="text-muted">Destinatário Padrão</span>}</td>
                <td>
                  {pkg.stop ? (
                    <Badge variant="success">Parada #{pkg.stop.stop_number}</Badge>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td>{getStatusBadge(pkg.status)}</td>
              </tr>
            );
          })}
          {packages.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                Nenhum pacote bipado neste saco ainda. Use o leitor ou a câmera do celular para iniciar a bipagem!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

