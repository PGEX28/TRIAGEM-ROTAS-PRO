import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PrinterService, type LocalPrinter } from '../../services/printerService';
import { printLabelsInNewWindow } from '../../services/printWindowService';
import { api } from '../../lib/api';
import { Printer, CheckCircle, RefreshCw } from 'lucide-react';
import type { LabelItemProps } from '../label/LabelCard';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: LabelItemProps[];
  bagId?: string;
}

export const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, labels, bagId }) => {
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [printers, setPrinters] = useState<LocalPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [copies, setCopies] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    const isOnline = await PrinterService.checkAgentStatus();
    setAgentOnline(isOnline);

    if (isOnline) {
      const printerList = await PrinterService.getPrinters();
      setPrinters(printerList);
      const defaultP = printerList.find((p) => p.isDefault) || printerList[0];
      if (defaultP) setSelectedPrinter(defaultP.name);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      checkStatus();
    }
  }, [isOpen]);

  const handlePrint = async () => {
    setLoading(true);
    setSuccessMessage(null);

    try {
      if (agentOnline && selectedPrinter) {
        // Enviar ZPL das etiquetas selecionadas
        for (const label of labels) {
          if (label.zpl) {
            await PrinterService.printRaw(selectedPrinter, label.zpl, copies);
          }
        }

        // Registrar no backend
        if (bagId) {
          await api.post(`/print/bag/${bagId}`, { copies }).catch(() => {});
        }

        setSuccessMessage(`${labels.length} etiqueta(s) enviada(s) para "${selectedPrinter}"!`);
      } else {
        // Fallback: abre janela dedicada com QR codes embutidos localmente
        if (bagId) {
          await api.post(`/print/bag/${bagId}`, { copies }).catch(() => {});
        }
        await printLabelsInNewWindow(labels);
        setSuccessMessage('Janela de impressão aberta! Selecione sua impressora no diálogo.');
      }
    } catch (error: any) {
      console.error('Erro na impressão:', error);
      alert('Erro ao disparar impressão.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
        paddingTop: '4rem',
        overflowY: 'auto',
      }}
    >
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '1rem' }}>
        <Card>
          <CardHeader title="Central de Impressão" />

          {/* Status do Agente Local */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--surface-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem',
            }}
          >
            <div className="flex items-center gap-3">
              <Printer size={20} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Agente Local (Porta 8181)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {agentOnline ? 'Impressão térmica direta ativa' : 'Agente offline — usando modo navegador'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {agentOnline ? (
                <Badge variant="success">🟢 Conectado</Badge>
              ) : (
                <Badge variant="warning">🟡 Modo Web</Badge>
              )}
              <button
                onClick={checkStatus}
                title="Verificar novamente"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Seleção de Impressora (se online) */}
          {agentOnline && printers.length > 0 && (
            <div className="form-group">
              <label className="form-label">Impressora Térmica do Windows</label>
              <select
                className="form-input"
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                style={{ width: '100%' }}
              >
                {printers.map((p, idx) => (
                  <option key={idx} value={p.name}>
                    {p.name} {p.isDefault ? '(Padrão)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantidade de Cópias */}
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Etiquetas Selecionadas</label>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontWeight: 700 }}>
                {labels.length} unidade(s)
              </div>
            </div>

            <div>
              <label className="form-label">Cópias por Etiqueta</label>
              <input
                type="number"
                min={1}
                max={10}
                className="form-input"
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Sucesso */}
          {successMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Fechar
            </Button>
            <Button onClick={handlePrint} isLoading={loading} disabled={labels.length === 0}>
              <Printer size={18} />
              {agentOnline ? 'Imprimir Direto (RAW)' : 'Imprimir via Navegador'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
