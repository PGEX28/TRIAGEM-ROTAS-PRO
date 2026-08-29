import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { fetchAddressByZip } from '../../services/addressLookup';
import { parseAnjunQR, looksLikeAddressQR } from '../../services/anjunQrParser';
import { captureFromCamera, extractTextFromImage } from '../../services/labelOCRService';
import { extractAddressWithAI } from '../../services/aiVisionService';
import { formatVisionFallbackStatus } from '../../services/aiVisionEligibility';
import { api } from '../../lib/api';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, QrCode, ChevronDown, X, CheckCircle, ScanLine, FileText } from 'lucide-react';
import { audio } from '../../services/audioService';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  packageId: string;
  bagId: string;
}

// qr_scan → tenta ler QR code da câmera (rápido, sem OCR)
// ocr_photo → modo câmera para fotografar etiqueta e fazer OCR
// confirm → dados lidos prontos para confirmar (1 clique)
// manual → formulário manual
type ModalMode = 'qr_scan' | 'ocr_photo' | 'confirm' | 'manual';

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen, onClose, onSaved, packageId, bagId,
}) => {
  const [mode, setMode] = useState<ModalMode>('ocr_photo');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [searchingZip, setSearchingZip] = useState(false);
  const [qrScanActive, setQrScanActive] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [qrError, setQrError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    recipientName: '', zipCode: '', street: '', number: '',
    complement: '', neighborhood: '', city: '', state: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ recipientName: '', zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
      // Etiquetas Temu/Shein geralmente não armazenam endereço útil no QR Code.
      setMode('ocr_photo');
      setQrStatus('idle');
      setQrScanActive(false);
      setQrError(null);
      setOcrStatus('');
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

  // Iniciar câmera nativa (funciona no mobile)
  const startCameraStream = async (): Promise<MediaStream | null> => {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      testStream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      if (videoDevices.length === 0) return null;

      const cam = videoDevices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('traseira') ||
        d.label.toLowerCase().includes('environment')
      ) || videoDevices[0];

      const video = cam.deviceId
        ? { deviceId: { exact: cam.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } };
      const constraints: MediaStreamConstraints = { video };

      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      return null;
    }
  };

  // === MODO QR SCAN ===
  useEffect(() => {
    if (!isOpen || mode !== 'qr_scan') {
      if (mode !== 'ocr_photo') stopCamera();
      return;
    }
    startQRScan();
    return () => stopCamera();
  }, [isOpen, mode]);

  const startQRScan = async () => {
    setQrScanActive(true);
    setQrStatus('scanning');
    setQrError(null);

    await new Promise<void>((r) => setTimeout(r, 300));
    if (!videoRef.current) {
      setQrError('Câmera não disponível. Use "Fotografar Etiqueta" ou preencha manualmente.');
      setQrStatus('failed');
      return;
    }

    const liveStream = await startCameraStream();
    if (!liveStream) {
      setQrError('Permissão de câmera negada ou câmera não encontrada.');
      setQrStatus('failed');
      return;
    }

    streamRef.current = liveStream;
    videoRef.current.srcObject = liveStream;
    videoRef.current.setAttribute('playsinline', 'true');
    await videoRef.current.play().catch(() => {});

    try {
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
    } catch (_) {
      setQrError('Não foi possível iniciar a leitura de QR Code.');
      setQrStatus('failed');
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

        if (parsed.zipCode && (!parsed.street || !parsed.city)) {
          const viaCep = await fetchAddressByZip(parsed.zipCode.replace(/\D/g, ''));
          if (viaCep) {
            filled.street = viaCep.logradouro || filled.street;
            filled.neighborhood = viaCep.bairro || filled.neighborhood;
            filled.city = viaCep.localidade || filled.city;
            filled.state = viaCep.uf || filled.state;
          }
        }

        setFormData(filled);
        setQrStatus('success');

        if (filled.recipientName && (filled.zipCode || filled.city)) {
          setMode('confirm');
        } else {
          setMode('manual');
        }
        return;
      }
    }

    // QR não tem endereço → oferecer modo OCR (foto da etiqueta)
    setQrError('QR Code não contém endereço de entrega (etiqueta Temu/Shein tem QR do remetente). Use "Fotografar Etiqueta" para ler o texto automaticamente.');
    setQrStatus('failed');
    // Vai para modo OCR automaticamente
    setTimeout(() => setMode('ocr_photo'), 800);
  }, []);

  // === MODO OCR PHOTO ===
  useEffect(() => {
    if (!isOpen || mode !== 'ocr_photo') {
      if (mode !== 'qr_scan') stopCamera();
      return;
    }
    startOCRCamera();
    return () => stopCamera();
  }, [isOpen, mode]);

  const startOCRCamera = async () => {
    await new Promise<void>((r) => setTimeout(r, 300));
    if (!videoRef.current) return;

    const liveStream = await startCameraStream();
    if (!liveStream) {
      setOcrStatus('Câmera não disponível. Use o formulário manual.');
      return;
    }

    streamRef.current = liveStream;
    videoRef.current.srcObject = liveStream;
    videoRef.current.setAttribute('playsinline', 'true');
    await videoRef.current.play().catch(() => {});
    setOcrStatus('Enquadre o CEP, o nome e o endereço da etiqueta');
  };

  const handleCaptureOCR = async () => {
    if (!videoRef.current || !streamRef.current) {
      setMode('manual');
      return;
    }

    setOcrLoading(true);
    setOcrStatus('Capturando imagem...');

    try {
      // captureFromCamera agora retorna Blob diretamente (com pré-processamento)
      const blob = captureFromCamera(videoRef.current);
      stopCamera();

      setOcrStatus('Lendo etiqueta com IA...');
      const aiResult = await extractAddressWithAI(blob);
      let parsed = aiResult.address;
      let raw = '';

      if (parsed) {
        console.log('Endereço lido por IA:', parsed);
      } else {
        setOcrStatus(formatVisionFallbackStatus(aiResult.error));
        const ocrResult = await extractTextFromImage(blob);
        parsed = ocrResult.parsed;
        raw = ocrResult.raw;
        console.log('OCR bloco destinatário:', ocrResult.destinatarioBlock || 'NÃO ENCONTRADO');
        console.log('OCR parsed:', parsed);
      }

      if (parsed) {
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

        // Sempre enriquecer com ViaCEP quando há CEP — garante rua, bairro e cidade corretos
        if (filled.zipCode) {
          setOcrStatus('Consultando ViaCEP para completar endereço...');
          const viaCep = await fetchAddressByZip(filled.zipCode.replace(/\D/g, ''));
          if (viaCep) {
            if (!filled.street || filled.street.length < 5) filled.street = viaCep.logradouro || filled.street;
            filled.neighborhood = viaCep.bairro || filled.neighborhood;
            filled.city = viaCep.localidade || filled.city;
            filled.state = viaCep.uf || filled.state;
          }
        }

        setFormData(filled);
        setQrStatus('success');

        // Vai para confirmar se tem nome + (CEP ou cidade) — mesmo com confidence baixo
        if (filled.recipientName && (filled.zipCode || filled.city !== 'Florianópolis')) {
          setMode('confirm');
        } else {
          setMode('manual');
          setOcrStatus('Dados parcialmente lidos. Complete os campos em branco.');
        }
      } else {
        // OCR não extraiu nada útil — vai para manual mostrando o texto bruto para o usuário
        console.warn('OCR falhou. Texto bruto:', raw);
        setMode('manual');
        setOcrStatus('OCR não reconheceu a etiqueta. Certifique-se de enquadrar apenas o bloco "DESTINATÁRIO" e tente novamente, ou preencha manualmente.');
      }
    } catch (err: any) {
      console.error('Erro no OCR:', err);
      setOcrStatus('Erro no processamento. Tente novamente ou preencha manualmente.');
      setMode('manual');
    } finally {
      setOcrLoading(false);
    }
  };

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
      console.error('Erro ao salvar:', error);
      audio.playError();
      setMode('manual');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleZipBlur = async () => {
    const cleanZip = formData.zipCode.replace(/\D/g, '');
    if (cleanZip.length === 8) {
      setSearchingZip(true);
      const address = await fetchAddressByZip(cleanZip);
      setSearchingZip(false);
      if (address) {
        setFormData(prev => ({
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

  // ============================
  // RENDER
  // ============================
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, backdropFilter: 'blur(6px)', padding: '0.75rem',
    }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '95vh', overflowY: 'auto' }}>
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                {mode === 'qr_scan' && <QrCode size={18} style={{ color: 'var(--primary)' }} />}
                {mode === 'ocr_photo' && <ScanLine size={18} style={{ color: 'var(--primary)' }} />}
                {mode === 'confirm' && <CheckCircle size={18} style={{ color: 'var(--success)' }} />}
                {mode === 'manual' && <FileText size={18} style={{ color: 'var(--primary)' }} />}
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {mode === 'qr_scan' && 'Lendo QR Code da etiqueta'}
                  {mode === 'ocr_photo' && 'Fotografar etiqueta (leitura automática)'}
                  {mode === 'confirm' && 'Confirmar dados de entrega'}
                  {mode === 'manual' && 'Informações de entrega'}
                </span>
              </div>
            }
            action={
              <Button variant="icon" onClick={() => { stopCamera(); onClose(); }}>
                <X size={18} />
              </Button>
            }
          />

          {/* ===== QR SCAN MODE ===== */}
          {mode === 'qr_scan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
              {/* Viewfinder */}
              <CameraViewfinder
                videoRef={videoRef}
                active={qrScanActive}
                status={qrStatus}
                error={qrError}
                scanLabel="Aponte para o QR Code"
              />

              {qrStatus === 'scanning' && (
                <p className="text-muted" style={{ fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>
                  📷 Aponte para o <strong>QR Code</strong> da etiqueta.<br />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Etiquetas Temu/Shein: o QR do remetente não tem endereço — use "Fotografar Etiqueta".
                  </span>
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Button variant="primary" onClick={() => { stopCamera(); setMode('ocr_photo'); }} style={{ fontSize: '0.82rem', padding: '0.6rem' }}>
                  <ScanLine size={14} /> Fotografar Etiqueta
                </Button>
                <Button variant="secondary" onClick={() => { stopCamera(); setMode('manual'); }} style={{ fontSize: '0.82rem', padding: '0.6rem' }}>
                  <ChevronDown size={14} /> Digitar Manual
                </Button>
              </div>
              <Button variant="secondary" onClick={() => { stopCamera(); onClose(); }} style={{ fontSize: '0.82rem', width: '100%' }}>
                Pular por Agora
              </Button>
            </div>
          )}

          {/* ===== OCR PHOTO MODE ===== */}
          {mode === 'ocr_photo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
              {/* Banner de instrução */}
              <div style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: 'rgba(99,102,241,0.1)',
                border: '1px solid var(--primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                color: 'var(--text)',
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              }}>
                <ScanLine size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Enquadre o CEP, nome e endereço</strong> da etiqueta e clique em "Capturar e Ler".
                  Funciona mesmo quando a etiqueta não traz o título "DESTINATÁRIO".
                </span>
              </div>

              {/* Viewfinder */}
              <CameraViewfinder
                videoRef={videoRef}
                active={!ocrLoading}
                status={ocrLoading ? 'scanning' : 'idle'}
                error={null}
                scanLabel="Enquadre CEP, nome e endereço"
              />

              {ocrStatus && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                  {ocrLoading && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', marginRight: 6 }} />}
                  {ocrStatus}
                </p>
              )}

              <Button
                onClick={handleCaptureOCR}
                isLoading={ocrLoading}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
                disabled={ocrLoading}
              >
                📷 Capturar e Ler Etiqueta
              </Button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Button variant="secondary" onClick={() => { stopCamera(); setMode('qr_scan'); }} style={{ fontSize: '0.82rem' }}>
                  Voltar QR Code
                </Button>
                <Button variant="secondary" onClick={() => { stopCamera(); setMode('manual'); }} style={{ fontSize: '0.82rem' }}>
                  Digitar Manual
                </Button>
              </div>
            </div>
          )}

          {/* ===== CONFIRM MODE ===== */}
          {mode === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: 'rgba(16,185,129,0.1)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem', color: 'var(--success)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <CheckCircle size={15} />
                Dados lidos da etiqueta! Confirme e salve com 1 clique.
              </div>

              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '0.6rem',
              }}>
                <ConfirmRow label="Destinatário" value={formData.recipientName} large />
                <ConfirmRow label="CEP" value={formData.zipCode} />
                <ConfirmRow label="Endereço" value={[formData.street, formData.number, formData.complement].filter(Boolean).join(', ')} />
                <ConfirmRow label="Bairro" value={formData.neighborhood} />
                <ConfirmRow label="Cidade / UF" value={[formData.city, formData.state].filter(Boolean).join(' / ')} />
              </div>

              <Button
                isLoading={loading}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => autoSave(formData)}
              >
                ✓ Confirmar e Salvar
              </Button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Button variant="secondary" style={{ fontSize: '0.82rem' }} onClick={() => setMode('manual')} disabled={loading}>
                  Editar Dados
                </Button>
                <Button variant="secondary" style={{ fontSize: '0.82rem' }} onClick={() => { stopCamera(); onClose(); }} disabled={loading}>
                  Pular por Agora
                </Button>
              </div>
            </div>
          )}

          {/* ===== MANUAL MODE ===== */}
          {mode === 'manual' && (
            <form onSubmit={handleSubmit}>
              {qrStatus === 'success' && (
                <div style={{
                  padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
                  backgroundColor: 'rgba(16,185,129,0.08)',
                  border: '1px solid var(--success)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem', color: 'var(--success)',
                }}>
                  ✅ Dados pré-preenchidos da etiqueta — verifique e salve.
                </div>
              )}
              {ocrStatus && mode === 'manual' && (
                <div style={{
                  padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem', color: 'var(--danger)',
                }}>
                  ⚠️ {ocrStatus}
                </div>
              )}

              <Input label="Destinatário" name="recipientName" value={formData.recipientName} onChange={handleChange} placeholder="Nome do cliente" required autoFocus={qrStatus !== 'success'} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <Input label="CEP" name="zipCode" value={formData.zipCode} onChange={handleChange} onBlur={handleZipBlur} placeholder="00000-000" required />
                  {searchingZip && <span className="spinner" style={{ position: 'absolute', right: 10, top: 35, width: 14, height: 14, borderWidth: 2 }} />}
                </div>
                <Input label="Rua / Avenida / Servidão" name="street" value={formData.street} onChange={handleChange} placeholder="Nome da via" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Input id="address-number" label="Número" name="number" value={formData.number} onChange={handleChange} placeholder="61" required />
                <Input label="Complemento" name="complement" value={formData.complement} onChange={handleChange} placeholder="Casa, Apto, Bloco" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Input label="Bairro" name="neighborhood" value={formData.neighborhood} onChange={handleChange} required />
                <Input label="Cidade" name="city" value={formData.city} onChange={handleChange} required />
                <Input label="UF" name="state" value={formData.state} onChange={handleChange} maxLength={2} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="button" variant="secondary" onClick={() => { stopCamera(); setMode('ocr_photo'); }} style={{ fontSize: '0.8rem' }}>
                    <ScanLine size={13} /> OCR
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { stopCamera(); setMode('qr_scan'); }} style={{ fontSize: '0.8rem' }}>
                    <Camera size={13} /> QR
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="button" variant="secondary" onClick={() => { stopCamera(); onClose(); }} disabled={loading} style={{ fontSize: '0.8rem' }}>
                    Pular
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
          0% { top: 15%; } 50% { top: 80%; } 100% { top: 15%; }
        }
      `}</style>
    </div>
  );
};

// ─── Sub-componentes ───────────────────────────────────────────────────────────

const CameraViewfinder: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  status: string;
  error: string | null;
  scanLabel: string;
}> = ({ videoRef, active, status, error, scanLabel }) => (
  <div style={{
    position: 'relative', width: '100%', height: '200px',
    backgroundColor: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden',
  }}>
    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

    {active && status === 'scanning' && (
      <>
        <div style={{ position: 'absolute', top: '12%', left: '10%', width: '80%', height: '76%' }}>
          {[
            { top: 0, left: 0, borderTop: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)' },
            { top: 0, right: 0, borderTop: '3px solid var(--primary)', borderRight: '3px solid var(--primary)' },
            { bottom: 0, left: 0, borderBottom: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)' },
            { bottom: 0, right: 0, borderBottom: '3px solid var(--primary)', borderRight: '3px solid var(--primary)' },
          ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />)}
        </div>
        <div style={{
          position: 'absolute', left: '10%', right: '10%', height: '2px',
          background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)',
          animation: 'scanLine 2s linear infinite', top: '15%',
        }} />
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)',
        }}>
          {scanLabel}
        </div>
      </>
    )}

    {error && (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)',
        flexDirection: 'column', gap: 8, padding: '1rem', textAlign: 'center',
      }}>
        <Camera size={28} style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.4 }}>{error}</span>
      </div>
    )}
  </div>
);

const ConfirmRow: React.FC<{ label: string; value: string; large?: boolean }> = ({ label, value, large }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <span style={{ fontSize: large ? '1rem' : '0.9rem', fontWeight: large ? 700 : 500, color: value ? 'var(--text)' : 'var(--text-muted)' }}>
      {value || '—'}
    </span>
  </div>
);
