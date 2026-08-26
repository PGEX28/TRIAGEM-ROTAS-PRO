import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Camera, X } from 'lucide-react';

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);

  // 1. Inicializar lista de câmeras e pedir permissão
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const startCamera = async () => {
      try {
        // Solicita permissão explícita com preferência para câmera traseira
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        // Libera a stream de teste para listar dispositivos com labels
        stream.getTracks().forEach((track) => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');

        if (isMounted) {
          setCameras(videoDevices);

          // Procura câmera traseira
          const backCam = videoDevices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('traseira') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('0')
          ) || videoDevices[0];

          if (backCam) {
            setSelectedCamera(backCam.deviceId);
          } else {
            setSelectedCamera('default');
          }
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Erro ao acessar permissão de câmera:', err);
        if (isMounted) {
          setError(
            err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
              ? 'Permissão da câmera negada. Permita o acesso à câmera nas configurações do navegador.'
              : 'Não foi possível acessar a câmera do dispositivo.'
          );
          setLoading(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen]);

  // 2. Iniciar decodificação contínua no elemento de vídeo
  useEffect(() => {
    if (!isOpen || !videoRef.current || loading || error) return;

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const constraints: MediaStreamConstraints = selectedCamera && selectedCamera !== 'default'
      ? { video: { deviceId: { exact: selectedCamera } } }
      : { video: { facingMode: { ideal: 'environment' } } };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Essencial para iOS/Android
        videoRef.current.play();

        // Inicia decodificação do elemento de vídeo
        codeReader.decodeFromVideoElement(
          videoRef.current,
          (result, _err, controls) => {
            controlsRef.current = controls;
            if (result) {
              const text = result.getText();
              if (text) {
                onScan(text);
                // Parar stream
                stream.getTracks().forEach((track) => track.stop());
                if (controls) controls.stop();
                onClose();
              }
            }
          }
        );
      })
      .catch((err) => {
        console.error('Erro ao conectar stream de vídeo:', err);
        setError('Falha ao abrir a imagem da câmera. Tente selecionar outra câmera.');
      });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen, selectedCamera, loading, error, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '1rem' }}>
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Camera size={20} className="text-primary" />
                <span>Leitor Óptico por Câmera</span>
              </div>
            }
            action={
              <Button variant="icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </Button>
            }
          />

          {error ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--danger)' }}>
              {error}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '280px',
                  backgroundColor: '#000',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Laser scan line animation overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '10%',
                    right: '10%',
                    height: '2px',
                    backgroundColor: 'var(--danger)',
                    boxShadow: '0 0 8px var(--danger)',
                  }}
                />
              </div>

              {cameras.length > 1 && (
                <div className="form-group mt-4" style={{ width: '100%', marginBottom: 0 }}>
                  <label className="form-label">Selecionar Câmera</label>
                  <select
                    className="form-input"
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {cameras.map((c) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || `Câmera ${c.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-muted text-center" style={{ fontSize: '0.8rem', marginTop: '1rem', marginBottom: 0 }}>
                Aponte a câmera para o código de barras do pacote. A leitura é instantânea.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
