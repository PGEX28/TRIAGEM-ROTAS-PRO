import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { fetchAddressByZip } from '../../services/addressLookup';
import { parseAnjunQR, looksLikeAddressQR } from '../../services/anjunQrParser';
import { api } from '../../lib/api';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, Zap, QrCode, ChevronDown, X, CheckCircle } from 'lucide-react';
import { audio } from '../../services/audioService';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  packageId: string;
  bagId: string;
}

type ModalMode = 'qr_scan' | 'confirm' | 'manual';

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  packageId,
  bagId,
}) => {
  const [mode, setMode] = useState<ModalMode>('qr_scan');
  const [loading, setLoading] = useState(false);
  const [searchingZip, setSearchingZip] = useState(false);
  const [qrScanActive, setQrScanActive] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [qrError, setQrError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    recipientName: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  // Reset on new package
  useEffect(() => {
    if (isOpen) {
      setFormData({ recipientName: '', zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
      setMode('qr_scan');
      setQrStatus('idle');
      setQrScanActive(false);
      setQrError(null);
    } else {
      stopCamera();
    }
  }, [isOpen, packageId]);

  const stopCamera = () => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch (_) {}
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Auto-start QR scan when in qr_scan mode
  useEffect(() => {
    if (!isOpen || mode !== 'qr_scan') {
      stopCamera();
      return;
    }
    startQRScan();
    return () => stopCamera();
  }, [isOpen, mode]);

  const startQRScan = async () => {
    setQrScanActive(true);
    setQrStatus('scanning');
    setQrError(null);

    try {
      // Aguarda o elemento de vídeo estar montado
      await new Promise<void>((r) => setTimeout(r, 300));
      if (!videoRef.current) {
        setQrError('Câmera não disponível neste dispositivo.');
        setQrStatus('failed');
        return;
      }

      // Solicitar permissão com preferência pela câmera traseira (fix mobile)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });

      // Liberar stream de teste para listar dispositivos com labels
      stream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      if (videoDevices.length === 0) {
        setQrError('Nenhuma câmera encontrada. Use a entrada manual abaixo.');
        setQrStatus('failed');
        return;
      }

      // Seleciona câmera traseira
      const cam = videoDevices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('traseira') ||
        d.label.toLowerCase().includes('environment')
      ) || videoDevices[0];

      const constraints: MediaStreamConstraints = cam.deviceId
        ? { video: { deviceId: { exact: cam.deviceId } } }
        : { video: { facingMode: { ideal: 'environment' } } };

      const liveStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = liveStream;

      if (!videoRef.current) { liveStream.getTracks().forEach(t => t.stop()); return; }

      videoRef.current.srcObject = liveStream;
      videoRef.current.setAttribute('playsinline', 'true');
      await videoRef.current.play();

      const codeReader = new BrowserMultiFormatReader();
      codeReader.decodeFromVideoElement(
        videoRef.current,
        (result, _err, controls) => {
          controlsRef.current = controls;
          if (result) {
            const text = result.getText();
            if (text) {
              liveStream.getTracks().forEach(t => t.stop());
              controls?.stop();
              handleQRScanned(text);
            }
          }
        }
      );
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Permissão de câmera negada. Habilite nas configurações do navegador.'
        : 'Não foi possível iniciar a câmera: ' + (err.message || '');
      setQrError(msg);
      setQrStatus('failed');
      setQrScanActive(false);
    }
  };

  const handleQRScanned = useCallback(async (text: string) => {
    stopCamera();
    setQrScanActive(false);

    if (looksLikeAddressQR(text)) {
      const parsed = parseAnjunQR(text);
      if (parsed && parsed.confidence >= 40) {
        let filled = {
          recipientName: parsed.recipientName || '',
          zipCode: parsed.zipCode || '',
          street: parsed.street || '',
          number: parsed.number || '',
          complement: parsed.complement || '',
          neighborhood: parsed.neighborhood || '',
          city: parsed.city || '',
          state: parsed.state || '',
        };

        // Enriquecer com ViaCEP se faltar rua ou cidade
        if (parsed.zipCode && (!parsed.street || !parsed.city)) {
          const clean = parsed.zipCode.replace(/\D/g, '');
          const viaCep = await fetchAddressByZip(clean);
          if (viaCep) {
            filled.street = viaCep.logradouro || filled.street;
            filled.neighborhood = viaCep.bairro || filled.neighborhood;
            filled.city = viaCep.localidade || filled.city;
            filled.state = viaCep.uf || filled.state;
          }
        }

        setFormData(filled);
        setQrStatus('success');

        // Tem destinatário + CEP ou cidade: mostrar modo confirmar (1 clique)
        if (filled.recipientName && (filled.zipCode || filled.city)) {
          setMode('confirm');
        } else {
          // Dados parciais: formulário pré-preenchido
          setMode('manual');
        }
        return;
      }
    }

    // QR não reconhecido como endereço → modo manual vazio
    setQrError('QR Code não contém endereço reconhecível. Preencha os dados abaixo.');
    setQrStatus('failed');
    setMode('manual');
  }, []);

  const autoSave = async (data: typeof formData) => {
    try {
      setLoading(true);
      await api.post(`/packages/${packageId}/address`, {
        bagId,
        recipientName: data.recipientName,
        addressData: {
          zip_code: data.zipCode,
          street: data.street,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
        },
        ocrConfidence: 100,
      });
      audio.playSuccess();
      onSaved();
    } catch (error: any) {
      console.error('Erro ao salvar endereço:', error);
      audio.playError();
      setMode('manual');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleZipBlur = async () => {
    const cleanZip = formData.zipCode.replace(/\D/g, '');
    if (cleanZip.length === 8) {
      setSearchingZip(true);
      const address = await fetchAddressByZip(cleanZip);
      setSearchingZip(false);
      if (address) {
        setFormData((prev) => ({
          ...prev,
          street: address.logradouro || prev.street,
          neighborhood: address.bairro || prev.neighborhood,
          city: address.localidade || prev.city,
          state: address.uf || prev.state,
        }));
        setTimeout(() => document.getElementById('address-number')?.focus(), 100);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await autoSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, backdropFilter: 'blur(6px)',
      padding: '1rem',
    }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '520px' }}>
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                {mode === 'qr_scan' && <QrCode size={20} style={{ color: 'var(--primary)' }} />}
                {mode === 'confirm' && <CheckCircle size={20} style={{ color: 'var(--success)' }} />}
                {mode === 'manual' && <Zap size={20} style={{ color: 'var(--primary)' }} />}
                <span>
                  {mode === 'qr_scan' && 'Aponte para o QR Code da etiqueta'}
                  {mode === 'confirm' && 'Confirmar Dados de Entrega'}
                  {mode === 'manual' && 'Informações de Entrega'}
                </span>
              </div>
            }
            action={
              <Button variant="icon" onClick={() => { stopCamera(); onClose(); }} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </Button>
            }
          />

          {/* === QR SCAN MODE === */}
          {mode === 'qr_scan' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' }}>

              {/* Camera viewfinder */}
              <div style={{
                position: 'relative', width: '100%', height: '220px',
                backgroundColor: '#000', borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* QR corner brackets overlay */}
                {qrScanActive && (
                  <>
                    <div style={{ position: 'absolute', top: '15%', left: '20%', width: '60%', height: '70%' }}>
                      {[
                        { top: 0, left: 0, borderTop: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)' },
                        { top: 0, right: 0, borderTop: '3px solid var(--primary)', borderRight: '3px solid var(--primary)' },
                        { bottom: 0, left: 0, borderBottom: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)' },
                        { bottom: 0, right: 0, borderBottom: '3px solid var(--primary)', borderRight: '3px solid var(--primary)' },
                      ].map((s, i) => (
                        <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />
                      ))}
                    </div>
                    <div style={{
                      position: 'absolute', left: '20%', right: '20%', height: '2px',
                      background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)',
                      animation: 'scanLine 1.5s linear infinite', top: '15%',
                    }} />
                  </>
                )}

                {qrStatus === 'failed' && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)',
                    flexDirection: 'column', gap: 8, padding: '1rem', textAlign: 'center',
                  }}>
                    <Camera size={32} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {qrError || 'Câmera não disponível'}
                    </span>
                  </div>
                )}
              </div>

              {qrStatus === 'scanning' && (
                <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                  📷 Aponte a câmera para o <strong>QR Code</strong> na etiqueta da Anjun/Shein/Temu.<br />
                  O endereço será lido e salvo <strong>automaticamente</strong>!
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
                <Button
                  variant="secondary"
                  onClick={() => { stopCamera(); setMode('manual'); }}
                  style={{ fontSize: '0.85rem' }}
                >
                  <ChevronDown size={14} /> Preencher Manualmente
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { stopCamera(); onClose(); }}
                  style={{ fontSize: '0.85rem' }}
                >
                  Pular por Agora
                </Button>
              </div>
            </div>
          )}

          {/* === CONFIRM MODE: QR lido com sucesso - 1 clique para confirmar === */}
          {mode === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Banner de sucesso */}
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(16,185,129,0.12)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem', color: 'var(--success)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <CheckCircle size={16} />
                <span>QR Code lido com sucesso! Verifique os dados e confirme.</span>
              </div>

              {/* Dados lidos — exibição compacta e legível */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <ConfirmRow label="Destinatário" value={formData.recipientName} large />
                <ConfirmRow label="CEP" value={formData.zipCode} />
                <ConfirmRow
                  label="Endereço"
                  value={[formData.street, formData.number, formData.complement].filter(Boolean).join(', ')}
                />
                <ConfirmRow label="Bairro" value={formData.neighborhood} />
                <ConfirmRow label="Cidade/UF" value={[formData.city, formData.state].filter(Boolean).join(' / ')} />
              </div>

              {/* Ações: Confirmar (principal) + editar + pular */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Button
                  isLoading={loading}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
                  onClick={() => autoSave(formData)}
                >
                  ✓ Confirmar e Salvar
                </Button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                    onClick={() => setMode('manual')}
                    disabled={loading}
                  >
                    Editar Dados
                  </Button>
                  <Button
                    variant="secondary"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                    onClick={() => { stopCamera(); onClose(); }}
                    disabled={loading}
                  >
                    Pular por Agora
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* === MANUAL MODE === */}
          {mode === 'manual' && (
            <form onSubmit={handleSubmit}>
              {qrStatus === 'success' && (
                <div style={{
                  padding: '0.6rem 1rem', marginBottom: '1rem',
                  backgroundColor: 'rgba(16,185,129,0.1)',
                  border: '1px solid var(--success)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem', color: 'var(--success)',
                }}>
                  ✅ QR Code lido! Verifique os dados e salve.
                </div>
              )}

              <Input
                label="Destinatário"
                name="recipientName"
                value={formData.recipientName}
                onChange={handleChange}
                placeholder="Nome do cliente"
                required
                autoFocus={qrStatus !== 'success'}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Input
                    label="CEP"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    onBlur={handleZipBlur}
                    placeholder="00000-000"
                    required
                  />
                  {searchingZip && (
                    <span className="spinner" style={{ position: 'absolute', right: 10, top: 35, width: 16, height: 16, borderWidth: 2 }} />
                  )}
                </div>
                <Input
                  label="Rua / Avenida / Servidão"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="Nome da via"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '1rem' }}>
                <Input
                  id="address-number"
                  label="Número"
                  name="number"
                  value={formData.number}
                  onChange={handleChange}
                  placeholder="170"
                  required
                />
                <Input
                  label="Complemento"
                  name="complement"
                  value={formData.complement}
                  onChange={handleChange}
                  placeholder="Casa, Apto, Bloco (Opcional)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <Input label="Bairro" name="neighborhood" value={formData.neighborhood} onChange={handleChange} required />
                <Input label="Cidade" name="city" value={formData.city} onChange={handleChange} required />
                <Input label="UF" name="state" value={formData.state} onChange={handleChange} maxLength={2} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => setMode('qr_scan')}>
                  <Camera size={14} /> Usar QR Code
                </Button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button type="button" variant="secondary" onClick={() => { stopCamera(); onClose(); }} disabled={loading}>
                    Pular por Agora
                  </Button>
                  <Button type="submit" isLoading={loading}>
                    Salvar Pacote
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Card>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 15%; }
          50% { top: 80%; }
          100% { top: 15%; }
        }
      `}</style>
    </div>
  );
};

/** Linha de dado confirmado — exibição limpa */
const ConfirmRow: React.FC<{ label: string; value: string; large?: boolean }> = ({ label, value, large }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </span>
    <span style={{
      fontSize: large ? '1.05rem' : '0.95rem',
      fontWeight: large ? 700 : 500,
      color: value ? 'var(--text)' : 'var(--text-muted)',
    }}>
      {value || '—'}
    </span>
  </div>
);
