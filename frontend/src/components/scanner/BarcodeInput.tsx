import React, { useEffect, useRef, useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Scan, Camera } from 'lucide-react';
import { CameraScanner } from './CameraScanner';

interface BarcodeInputProps {
  onScan: (barcode: string) => void;
  disabled?: boolean;
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({ onScan, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  // Keep focus on the input to enable continuous scanning
  useEffect(() => {
    const focusInput = () => {
      if (!disabled && !cameraOpen && inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [disabled, cameraOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onScan(value.trim());
      setValue(''); // clear input after scan
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
      <form onSubmit={handleSubmit} style={{ position: 'relative', flex: 1 }}>
        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <Scan size={20} />
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="Aguardando bip do leitor USB / Bluetooth..."
          autoComplete="off"
          style={{ paddingLeft: '40px', fontSize: '1.125rem', width: '100%' }}
        />
      </form>

      <Button
        type="button"
        variant="secondary"
        onClick={() => setCameraOpen(true)}
        title="Usar Câmera / Celular"
        style={{ padding: '0.65rem 0.9rem' }}
      >
        <Camera size={18} />
      </Button>

      <CameraScanner
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(code) => {
          onScan(code);
        }}
      />
    </div>
  );
};
