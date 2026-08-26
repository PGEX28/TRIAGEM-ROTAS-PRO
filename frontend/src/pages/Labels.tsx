import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LabelCard, type LabelItemProps } from '../components/label/LabelCard';
import { PrintModal } from '../components/print/PrintModal';
import { api } from '../lib/api';
import { Printer, ArrowLeft, CheckSquare, Square, Filter } from 'lucide-react';

export const Labels: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bagId = searchParams.get('bagId');
  const navigate = useNavigate();

  const [labels, setLabels] = useState<LabelItemProps[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStop, setSelectedStop] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const fetchLabels = useCallback(async () => {
    if (!bagId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/labels/bag/${bagId}`);
      const items: LabelItemProps[] = Array.isArray(data) ? data : data.data || [];
      setLabels(items);
      // Por padrão, selecionar todas
      setSelectedIds(new Set(items.map((i) => i.packageId)));
    } catch (error) {
      console.error('Erro ao buscar etiquetas:', error);
    } finally {
      setLoading(false);
    }
  }, [bagId]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const toggleSelect = (packageId: string) => {
    const next = new Set(selectedIds);
    if (next.has(packageId)) {
      next.delete(packageId);
    } else {
      next.add(packageId);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredLabels.map((l) => l.packageId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Filtragem por parada
  const uniqueStops = Array.from(new Set(labels.map((l) => l.stopNumber))).sort((a, b) => a - b);
  const filteredLabels = selectedStop === 'all'
    ? labels
    : labels.filter((l) => String(l.stopNumber) === selectedStop);

  const selectedLabelsToPrint = labels.filter((l) => selectedIds.has(l.packageId));

  if (!bagId) {
    return (
      <div className="p-6 text-center mt-12">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Nenhum saco especificado</h2>
        <Button onClick={() => navigate('/bags')}>Voltar para Sacos</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header com Ações */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center gap-4">
          <Button variant="icon" onClick={() => navigate(`/bags/${bagId}`)} style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              Etiquetas do Saco
              <Badge variant="primary">{labels.length} total</Badge>
            </h1>
            <p style={{ margin: 0, marginTop: '4px', fontSize: '0.875rem' }}>
              Selecione as etiquetas que deseja imprimir
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => setPrintModalOpen(true)}
            disabled={selectedLabelsToPrint.length === 0}
          >
            <Printer size={18} />
            Imprimir Selecionadas ({selectedLabelsToPrint.length})
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Seleção */}
      <Card style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={selectAll} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              <CheckSquare size={16} /> Selecionar Todas
            </Button>
            <Button variant="secondary" onClick={deselectAll} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              <Square size={16} /> Desmarcar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Filtrar por Parada:</span>
            <select
              className="form-input"
              value={selectedStop}
              onChange={(e) => setSelectedStop(e.target.value)}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="all">Todas as Paradas ({labels.length})</option>
              {uniqueStops.map((stopNum) => {
                const count = labels.filter((l) => l.stopNumber === stopNum).length;
                return (
                  <option key={stopNum} value={String(stopNum)}>
                    Parada #{stopNum} ({count} pacotes)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </Card>

      {/* Grid de Etiquetas */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
        </div>
      ) : filteredLabels.length === 0 ? (
        <Card style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhuma etiqueta gerada para os filtros selecionados.
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            justifyItems: 'center',
          }}
        >
          {filteredLabels.map((label) => (
            <LabelCard
              key={label.packageId}
              label={label}
              selected={selectedIds.has(label.packageId)}
              onSelect={() => toggleSelect(label.packageId)}
            />
          ))}
        </div>
      )}

      {/* Modal de Impressão */}
      <PrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        labels={selectedLabelsToPrint}
        bagId={bagId}
      />
    </div>
  );
};
