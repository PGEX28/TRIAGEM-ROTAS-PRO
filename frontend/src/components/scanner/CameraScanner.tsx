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
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
      return;
    }

    const initCamera = async () => {
      try {
        setError(null);
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        setCameras(devices);

        // Prefer back/environment camera
        const backCamera = devices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('traseira') ||
          d.label.toLowerCase().includes('environment')
        ) || devices[0];

        if (backCamera) {
          setSelectedCamera(backCamera.deviceId);
        }
      } catch (err: any) {
        setError('Não foi possível acessar a câmera do dispositivo.');
      }
    };

    initCamera();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedCamera || !videoRef.current) return;

    const codeReader = new BrowserMultiFormatReader();

    codeReader.decodeFromVideoDevice(
      selectedCamera,
      videoRef.current,
      (result, _err, controls) => {
        controlsRef.current = controls;
        if (result) {
          onScan(result.getText());
          controls.stop();
          onClose();
        }
      }
    ).catch((err) => {
      console.warn('Erro ao iniciar stream de vídeo:', err);
    });

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [isOpen, selectedCamera, onScan, onClose]);

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
