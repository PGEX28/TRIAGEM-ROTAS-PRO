import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { PrinterService } from '../services/printerService';
import { Settings as SettingsIcon, Save, Volume2, Printer, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [formData, setFormData] = useState({
    operation_name: 'Triagem Florianópolis',
    city: 'Florianópolis',
    state: 'SC',
    auto_print: false,
    sound_enabled: true,
    auto_group: true,
    ocr_min_confidence: 60,
    label_width_mm: 100,
    label_height_mm: 150,
  });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [settingsRes, isAgentAlive] = await Promise.all([
          api.get('/settings').catch(() => ({ data: null })),
          PrinterService.checkAgentStatus(),
        ]);

        if (settingsRes.data) {
          setFormData((prev) => ({ ...prev, ...settingsRes.data }));
        }
        setAgentOnline(isAgentAlive);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(false);
      await api.put('/settings', formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      alert(err.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '850px' }}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SettingsIcon className="text-primary" />
            Configurações da Operação
          </h1>
          <p>Personalize parâmetros de triagem, impressão térmica e automações</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader title="Geral & Identificação" />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
              <Input
                label="Nome da Operação / Filial"
                name="operation_name"
                value={formData.operation_name}
                onChange={handleChange}
                required
              />
              <Input
                label="Cidade Base"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
              <Input
                label="UF"
                name="state"
                value={formData.state}
                onChange={handleChange}
                maxLength={2}
                required
              />
            </div>
          </Card>

          {/* Automações da Triagem */}
          <Card>
            <CardHeader title="Comportamento da Triagem & OCR" />
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="auto_group"
                  checked={formData.auto_group}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Agrupamento Automático de Paradas</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Detecta automaticamente se o endereço já existe no saco e atribui à mesma parada.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="sound_enabled"
                  checked={formData.sound_enabled}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <div className="flex items-center gap-2" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    <Volume2 size={16} /> Alertas Sonoros em Bips
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Emite som característico de sucesso ou alerta de duplicata/erro no scanner.
                  </div>
                </div>
              </label>

              <div className="form-group" style={{ maxWidth: '300px', marginTop: '0.5rem' }}>
                <label className="form-label">Confiança Mínima do OCR (%)</label>
                <input
                  type="number"
                  min={30}
                  max={95}
                  name="ocr_min_confidence"
                  className="form-input"
                  value={formData.ocr_min_confidence}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Card>

          {/* Impressão e Etiquetas */}
          <Card>
            <CardHeader title="Impressoras & Etiquetas Térmicas" />
            <div className="flex flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Largura da Etiqueta (mm)</label>
                  <input
                    type="number"
                    name="label_width_mm"
                    className="form-input"
                    value={formData.label_width_mm}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Altura da Etiqueta (mm)</label>
                  <input
                    type="number"
                    name="label_height_mm"
                    className="form-input"
                    value={formData.label_height_mm}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--surface-glass)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Printer size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Status do Print Agent Local</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {agentOnline ? 'Conectado na porta 8181 (Pronto)' : 'Desconectado (Usando diálogo padrão do Windows)'}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: agentOnline ? 'var(--success-bg)' : 'var(--warning-bg)', color: agentOnline ? 'var(--success)' : 'var(--warning)' }}>
                  {agentOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>
          </Card>

          {/* Botão de Salvar e Feedback */}
          <div className="flex items-center justify-between" style={{ marginTop: '0.5rem' }}>
            <div>
              {savedSuccess && (
                <div className="flex items-center gap-2 text-success" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  <CheckCircle size={18} /> Configurações salvas com sucesso!
                </div>
              )}
            </div>

            <Button type="submit" isLoading={saving} style={{ minWidth: '160px' }}>
              <Save size={18} /> Salvar Alterações
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
