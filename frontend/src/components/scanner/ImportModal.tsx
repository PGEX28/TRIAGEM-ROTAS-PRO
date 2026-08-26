import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { UploadCloud, CheckCircle, X } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bagId: string;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, bagId, onSuccess }) => {
  const [items, setItems] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        // Normalize common column names
        const normalized = data.map((row: any) => ({
          barcode: String(row.barcode || row.codigo || row['Código'] || row['Código de Barras'] || row.track || row.rastreio || '').trim(),
          recipient_name: String(row.recipient || row.destinatario || row['Destinatário'] || row.cliente || row['Nome'] || '').trim(),
          street: String(row.street || row.rua || row['Rua'] || row.logradouro || row['Endereço'] || '').trim(),
          number: String(row.number || row.numero || row['Número'] || row['Nº'] || '').trim(),
          complement: String(row.complement || row.complemento || row['Complemento'] || '').trim(),
          neighborhood: String(row.neighborhood || row.bairro || row['Bairro'] || '').trim(),
          city: String(row.city || row.cidade || row['Cidade'] || '').trim(),
          state: String(row.state || row.uf || row['Estado'] || row['UF'] || '').trim(),
          zip_code: String(row.zip || row.cep || row['CEP'] || '').trim(),
        })).filter((item: any) => item.barcode);

        setItems(normalized);
      } catch (err) {
        alert('Erro ao ler arquivo. Verifique o formato CSV/XLSX.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (items.length === 0) return;
    try {
      setLoading(true);
      const { data } = await api.post(`/import/bag/${bagId}`, { items });
      setImportResult(data);
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao importar lote');
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '650px', padding: '1rem' }}>
        <Card>
          <CardHeader
            title="Importar Lista de Pacotes (CSV / Excel)"
            action={
              <Button variant="icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </Button>
            }
          />

          {!importResult ? (
            <div>
              {/* Dropzone */}
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  backgroundColor: 'var(--surface-glass)',
                  marginBottom: '1.25rem',
                }}
              >
                <UploadCloud size={40} className="text-primary" style={{ marginBottom: '0.75rem' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {fileName || 'Clique para selecionar planilha (.csv, .xlsx, .xls)'}
                </span>
                <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Detecta colunas de código de barras, destinatário e endereço automaticamente
                </span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Preview Table */}
              {items.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Prévia dos Registros ({items.length} pacotes encontrados)
                    </span>
                  </div>

                  <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Destinatário</th>
                          <th>Cidade/UF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{row.barcode}</td>
                            <td>{row.recipient_name || '-'}</td>
                            <td>{row.city ? `${row.city}/${row.state}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {items.length > 5 && (
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', textAlign: 'right' }}>
                      E mais {items.length - 5} registros...
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} isLoading={loading} disabled={items.length === 0}>
                  Importar {items.length > 0 ? `(${items.length} pacotes)` : ''}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', backgroundColor: 'var(--success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={28} color="var(--success)" />
              </div>
              <h3>Importação Concluída com Sucesso!</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', margin: '1.5rem 0' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                    {importResult.successCount}
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Importados</span>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>
                    {importResult.duplicateCount}
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Duplicatas</span>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>
                    {importResult.errorCount}
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Erros</span>
                </div>
              </div>

              <Button onClick={onClose} style={{ minWidth: '140px' }}>
                Fechar
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
