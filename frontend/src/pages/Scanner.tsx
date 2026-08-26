import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { Scan, Package as PkgIcon } from 'lucide-react';

export const Scanner: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bagId = searchParams.get('bagId');
  
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagId) {
      alert('Selecione um saco primeiro!');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/packages/scan', { bagId, barcode });
      setResult(data);
      setBarcode(''); // clear for next scan
    } catch (error: any) {
      console.error('Scan failed', error);
      setResult({ success: false, message: error.response?.data?.error || 'Erro ao processar pacote' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Scanner</h1>
          <p>Saco selecionado: {bagId ? <span style={{ fontWeight: 600 }}>{bagId}</span> : <span className="text-danger">Nenhum</span>}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Scan className="text-primary" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Escanear Pacote</h2>
          </div>
          
          <form onSubmit={handleScan}>
            <Input
              autoFocus
              label="Código de Barras"
              placeholder="Ex: BR123456789"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              required
            />
            
            <Button type="submit" isLoading={loading} style={{ width: '100%' }}>
              Processar Bip
            </Button>
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <PkgIcon className="text-primary" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Resultado</h2>
          </div>
          
          {!result ? (
            <div className="text-muted flex flex-col items-center justify-center h-48" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              Aguardando bip...
            </div>
          ) : (
            <div className={`p-4 rounded-md ${result.success ? 'bg-success-bg border-success' : 'bg-danger-bg border-danger'}`} style={{ border: '1px solid', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ color: result.success ? 'var(--success)' : 'var(--danger)', marginBottom: '0.5rem' }}>
                {result.success ? 'Sucesso' : 'Erro'}
              </h3>
              <p>{result.message}</p>
              
              {result.package_id && (
                <div className="mt-4 text-sm text-muted">
                  ID: {result.package_id}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
