import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarcodeInput } from '../components/scanner/BarcodeInput';
import { PackageList } from '../components/scanner/PackageList';
import { StopSummary } from '../components/scanner/StopSummary';
import { AddressModal } from '../components/scanner/AddressModal';
import { api } from '../lib/api';

import { audio } from '../services/audioService';

export const Triage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bagId = searchParams.get('bagId');
  const [bag, setBag] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [currentPackageId, setCurrentPackageId] = useState<string>('');

  const fetchBagData = useCallback(async () => {
    if (!bagId) return;
    try {
      const [bagRes, pkgRes] = await Promise.all([
        api.get(`/bags/${bagId}`),
        api.get(`/packages/bag/${bagId}`)
      ]);
      setBag(bagRes.data);
      setPackages(pkgRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bagId]);

  useEffect(() => {
    fetchBagData();
  }, [fetchBagData]);

  const handleScan = async (barcode: string) => {
    try {
      const { data } = await api.post('/packages/scan', { bagId, barcode });
      if (!data.success) {
        audio.playError();
        alert(data.message);
      } else {
        audio.playSuccess();
        // Open modal for successful scans
        if (data.package_id) {
          setCurrentPackageId(data.package_id);
          setAddressModalOpen(true);
        }
      }
      fetchBagData(); // Refresh data
    } catch (err: any) {
      audio.playError();
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao bipar pacote');
    }
  };

  const handleAddressSaved = () => {
    setAddressModalOpen(false);
    fetchBagData();
  };

  if (!bagId) {
    return (
      <div className="p-6 text-center mt-12">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Nenhum saco selecionado</h2>
        <p className="text-muted">Por favor, volte à lista de sacos e selecione um saco para iniciar a triagem.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center mt-12"><div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div></div>;
  }

  return (
    <div className="triage-layout animate-fade-in">
      {/* Left Column - Scanner & Packages */}
      <div className="triage-main-col">
        <div className="page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Triagem — {bag?.code}</h1>
            <p>Escaneie os pacotes para adicioná-los ao saco atual</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={async () => {
                if (!window.confirm('Deseja finalizar este saco e exportar a rota para o Circuit?')) return;
                try {
                  // 1. Finalizar saco
                  await api.post(`/bags/${bagId}/finish`);
                  audio.playFinishBag();

                  // 2. Baixar automaticamente a planilha do Circuit com o nome do saco
                  try {
                    const response = await api.get(`/export/bag/${bagId}/circuit-csv`, { responseType: 'blob' });
                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    let cleanName = bag?.code || 'saco';
                    if (cleanName.includes(' - ')) {
                      cleanName = cleanName.split(' - ').slice(1).join(' - ').trim();
                    }
                    cleanName = cleanName.replace(/[\/\\:*?"<>|]/g, '_').trim();
                    link.download = `${cleanName}.csv`;
                    link.click();
                  } catch (csvErr) {
                    console.error('Erro ao baixar CSV após finalizar', csvErr);
                  }

                  // 3. Redirecionar para detalhes do saco via SPA Router
                  navigate(`/bags/${bagId}`);
                } catch (e: any) {
                  audio.playError();
                  alert(e.response?.data?.error || 'Erro ao finalizar saco');
                }
              }}
            >
              Finalizar Saco & Baixar CSV
            </Button>
          </div>
        </div>

        <Card>
          <BarcodeInput onScan={handleScan} />
        </Card>

        <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CardHeader title="Pacotes Escaneados" />
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--space-5) var(--space-5)' }}>
            <PackageList packages={packages} />
          </div>
        </Card>
      </div>

      {/* Right Column - Stops */}
      <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardHeader title="Resumo das Paradas" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--space-5) var(--space-5)' }}>
          <StopSummary stops={bag?.stops || []} />
        </div>
      </Card>
      
      {/* Modals */}
      <AddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaved={handleAddressSaved}
        packageId={currentPackageId}
        bagId={bagId}
      />
    </div>
  );
};
