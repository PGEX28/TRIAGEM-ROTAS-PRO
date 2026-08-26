import React from 'react';
import QRCode from 'react-qr-code';

export interface LabelItemProps {
  packageId: string;
  bagCode: string;
  stopNumber: number;
  orderNumber: number;
  volumeIndex: number;
  volumeTotal: number;
  recipientName: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  barcode: string;
  trackingCode?: string;
  qrCodeData: string;
  zpl?: string;
}

interface LabelCardProps {
  label: LabelItemProps;
  selected?: boolean;
  onSelect?: () => void;
}

export const LabelCard: React.FC<LabelCardProps> = ({ label, selected, onSelect }) => {
  const fullStreet = `${label.address.street || 'Rua'}, ${label.address.number || 'S/N'}${label.address.complement ? ` - ${label.address.complement}` : ''}`;
  const cityState = `${label.address.neighborhood || ''} — ${label.address.city || ''}/${label.address.state || ''}`;

  return (
    <div
      onClick={onSelect}
      className="label-card-container"
      style={{
        width: '320px',
        minHeight: '440px',
        backgroundColor: '#ffffff',
        color: '#000000',
        borderRadius: '8px',
        border: selected ? '3px solid var(--primary)' : '2.5px solid #000000',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onSelect ? 'pointer' : 'default',
        boxShadow: selected ? '0 0 14px var(--primary-glow)' : '0 4px 10px rgba(0,0,0,0.12)',
        position: 'relative',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div>
        {/* HEADER: CORREDOR / ORDEM DO CARRO (DESTAQUE MÁXIMO) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', border: '2px solid #000', borderRadius: '4px', overflow: 'hidden' }}>
          {/* Coluna Esquerda: ORDEM (Para carregar o veículo) */}
          <div style={{ padding: '6px 8px', borderRight: '2px solid #000', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
              ORDEM
            </span>
            <span style={{ fontSize: '2.6rem', fontWeight: 900, lineHeight: 1, color: '#000' }}>
              {String(label.orderNumber || label.stopNumber).padStart(2, '0')}
            </span>
          </div>

          {/* Coluna Direita: PARADA + VOLUMES */}
          <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>
                PARADA #{String(label.stopNumber).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, marginTop: '2px' }}>
                VOL {label.volumeIndex}/{label.volumeTotal}
              </div>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', borderTop: '1px solid #ddd', paddingTop: '2px', marginTop: '4px' }}>
              {label.bagCode?.split(' - ')[1] || label.bagCode?.split(' - ')[0] || 'LOTE'}
            </div>
          </div>
        </div>

        {/* SEGUNDA SEÇÃO: QR CODE PEQUENO + DADOS DO CLIENTE */}
        <div style={{ display: 'grid', gridTemplateColumns: '68px 1fr', gap: '10px', alignItems: 'center', margin: '10px 0', padding: '8px', border: '1.5px solid #000', borderRadius: '4px', backgroundColor: '#ffffff' }}>
          {/* QR Code Pequeno */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <QRCode value={label.qrCodeData || label.barcode} size={62} />
          </div>

          {/* Dados do Cliente */}
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: '#666', letterSpacing: '0.5px' }}>
              DESTINATÁRIO
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label.recipientName || 'Cliente'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#000', marginTop: '2px' }}>
              CEP: {label.address.zipCode || '00000-000'}
            </div>
          </div>
        </div>

        {/* TERCEIRA SEÇÃO: ENDEREÇO DE ENTREGA COMPLETO */}
        <div style={{ padding: '8px', border: '1.5px solid #000', borderRadius: '4px', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: '#666' }}>
            ENDEREÇO DE ENTREGA
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, lineHeight: 1.25, color: '#000', marginTop: '2px' }}>
            {fullStreet}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#333', marginTop: '3px' }}>
            {cityState}
          </div>
        </div>
      </div>
    </div>
  );
};
