import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarcodeInput } from '../components/scanner/BarcodeInput';
import { api } from '../lib/api';
import { Scan, Package as PkgIcon, Briefcase } from 'lucide-react';
import { audio } from '../services/audioService';

export const Scanner: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const bagId = searchParams.get('bagId');
  
  const [bags, setBags] = useState<any[]>([]);
  const [selectedBagId, setSelectedBagId] = useState<string>(bagId || '');
  const [loadingBags, setLoadingBags] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetchBags = async () => {
      try {
        setLoadingBags(true);
        const { data } = await api.get('/bags?status=IN_PROGRESS');
        const activeBags = data?.data || [];
        setBags(activeBags);

        if (!bagId && activeBags.length > 0) {
          setSelectedBagId(activeBags[0].id);
          setSearchParams({ bagId: activeBags[0].id });
        }
      } catch (err) {
        console.error('Erro ao listar sacos:', err);
      } finally {
        setLoadingBags(false);
      }
    };
    fetchBags();
  }, [bagId, setSearchParams]);

  const handleScan = async (barcode: string) => {
    const activeBag = selectedBagId || bagId;
    if (!activeBag) {
      audio.playError();
      alert('Selecione ou crie um saco primeiro para vincular o pacote!');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/packages/scan', { bagId: activeBag, barcode });
      setResult(data);
      if (data.success) {
        audio.playSuccess();
      } else {
        audio.playError();
      }
    } catch (error: any) {
      audio.playError();
      console.error('Scan failed', error);
      setResult({ success: false, message: error.response?.data?.error || 'Erro ao processar pacote' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Bipagem / Scanner de Pacotes</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>
            Escaneie pacotes por leitor óptico USB, bluetooth ou câmera do celular
          </p>
        </div>

        <div className="flex gap-2">
          {selectedBagId && (
            <Button variant="secondary" onClick={() => navigate(`/triage?bagId=${selectedBagId}`)}>
              Ir para Triagem Completa
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de Saco Ativo */}
      <Card>
        <div className="flex flex-col gap-2">
          <label className="form-label flex items-center gap-2" style={{ fontWeight: 600 }}>
            <Briefcase size={16} className="text-primary" /> Saco / Lote de Destino
          </label>

          {loadingBags ? (
            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Carregando sacos abertos...</div>
          ) : bags.length === 0 ? (
            <div className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Nenhum saco aberto no momento.</span>
              <Button variant="primary" onClick={() => navigate('/')} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                Criar Saco
              </Button>
            </div>
          ) : (
            <select
              className="form-input"
              value={selectedBagId}
              onChange={(e) => {
                setSelectedBagId(e.target.value);
                setSearchParams({ bagId: e.target.value });
              }}
              style={{ width: '100%', fontSize: '1rem', padding: '0.6rem' }}
            >
              {bags.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} ({b.package_count || 0} pacotes)
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Scan className="text-primary" />
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Leitor Óptico / Câmera</h2>
          </div>
          
          <BarcodeInput onScan={handleScan} disabled={loading || !selectedBagId} />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <PkgIcon className="text-primary" />
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Resultado da Leitura</h2>
          </div>
          
          {!result ? (
            <div className="text-muted flex flex-col items-center justify-center h-32" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              Aguardando bip ou captura pela câmera...
            </div>
          ) : (
            <div className={`p-4 rounded-md ${result.success ? 'bg-success-bg border-success' : 'bg-danger-bg border-danger'}`} style={{ border: '1px solid', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ color: result.success ? 'var(--success)' : 'var(--danger)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                {result.success ? '✓ Pacote Bipado com Sucesso' : '✕ Atenção'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{result.message}</p>
              
              {result.package_id && (
                <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
                  ID Pacote: {result.package_id}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
