import QRCode from 'qrcode';
import type { LabelItemProps } from '../components/label/LabelCard';

/**
 * Gera o HTML de uma única etiqueta com o QR code já embutido como base64
 */
function renderLabelHtml(label: LabelItemProps, qrDataUrl: string): string {
  const fullStreet = `${label.address.street || 'Rua'}, ${label.address.number || 'S/N'}${label.address.complement ? ` - ${label.address.complement}` : ''}`;
  const cityState = `${label.address.neighborhood || ''} — ${label.address.city || ''}/${label.address.state || ''}`;
  const loteName = label.bagCode?.includes(' - ')
    ? label.bagCode.split(' - ').slice(1).join(' - ')
    : (label.bagCode || 'LOTE');

  return `
    <div class="label-page">
      <div class="label">
        <!-- HEADER: ORDEM e PARADA -->
        <div class="header-grid">
          <div class="ordem-box">
            <span class="label-subtitle">ORDEM</span>
            <span class="ordem-number">${String(label.orderNumber || label.stopNumber).padStart(2, '0')}</span>
          </div>
          <div class="parada-box">
            <div>
              <div class="label-subtitle">PARADA #${String(label.stopNumber).padStart(2, '0')}</div>
              <div class="vol-text">VOL ${label.volumeIndex}/${label.volumeTotal}</div>
            </div>
            <div class="lote-text">${loteName}</div>
          </div>
        </div>

        <!-- DESTINATÁRIO + QR CODE -->
        <div class="dest-grid">
          <div class="qr-box">
            <img src="${qrDataUrl}" width="70" height="70" alt="QR Code" />
          </div>
          <div class="dest-info">
            <div class="label-subtitle">DESTINATÁRIO</div>
            <div class="dest-name">${label.recipientName || 'Cliente'}</div>
            <div class="dest-cep">CEP: ${label.address.zipCode || '00000-000'}</div>
          </div>
        </div>

        <!-- ENDEREÇO COMPLETO -->
        <div class="address-box">
          <div class="label-subtitle">ENDEREÇO DE ENTREGA</div>
          <div class="address-street">${fullStreet}</div>
          <div class="address-city">${cityState}</div>
        </div>

        <!-- CÓDIGO DE RASTREIO -->
        <div class="barcode-box">
          <div class="label-subtitle">RASTREIO / BIPAGEM</div>
          <div class="barcode-text">${label.barcode || label.trackingCode || '—'}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Abre uma nova janela dedicada de impressão com apenas as etiquetas selecionadas.
 * Os QR codes são gerados localmente como imagens base64 — sem dependência de internet.
 */
export async function printLabelsInNewWindow(labels: LabelItemProps[]): Promise<void> {
  if (labels.length === 0) return;

  // Gerar todos os QR codes como data URLs base64 antes de abrir a janela
  const qrDataUrls = await Promise.all(
    labels.map(async (label) => {
      const data = label.qrCodeData || label.barcode || label.trackingCode || 'ROTASPRO';
      try {
        return await QRCode.toDataURL(data, {
          width: 70,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch {
        return '';
      }
    })
  );

  const labelsHtml = labels.map((label, i) => renderLabelHtml(label, qrDataUrls[i])).join('');

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Etiquetas Rotas Pro — ${labels.length} unidade(s)</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: system-ui, -apple-system, Arial, sans-serif;
      background: #f0f0f0;
      color: #000;
    }

    .label-page {
      page-break-after: always;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 10mm;
      background: #f0f0f0;
    }

    .label-page:last-child {
      page-break-after: avoid;
    }

    .label {
      width: 100mm;
      min-height: 120mm;
      background: #fff;
      border: 2px solid #000;
      border-radius: 4px;
      padding: 4mm 5mm;
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }

    .header-grid {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      border: 2px solid #000;
      border-radius: 3px;
      overflow: hidden;
    }

    .ordem-box {
      padding: 3mm 4mm;
      border-right: 2px solid #000;
      display: flex;
      flex-direction: column;
      background: #fafafa;
    }

    .ordem-number {
      font-size: 2.2rem;
      font-weight: 900;
      line-height: 1;
      color: #000;
    }

    .parada-box {
      padding: 3mm 4mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .vol-text {
      font-size: 1.1rem;
      font-weight: 900;
      margin-top: 1mm;
    }

    .lote-text {
      font-size: 0.6rem;
      font-weight: 700;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 1mm;
      margin-top: 2mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dest-grid {
      display: grid;
      grid-template-columns: 75px 1fr;
      gap: 3mm;
      align-items: center;
      border: 1.5px solid #000;
      border-radius: 3px;
      padding: 3mm;
    }

    .qr-box {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .qr-box img {
      width: 70px;
      height: 70px;
      display: block;
    }

    .dest-name {
      font-size: 0.9rem;
      font-weight: 900;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #000;
      margin-top: 1mm;
    }

    .dest-cep {
      font-size: 0.75rem;
      font-weight: 800;
      color: #000;
      margin-top: 1mm;
    }

    .address-box {
      border: 1.5px solid #000;
      border-radius: 3px;
      padding: 3mm;
    }

    .address-street {
      font-size: 0.85rem;
      font-weight: 800;
      line-height: 1.3;
      color: #000;
      margin-top: 1mm;
    }

    .address-city {
      font-size: 0.75rem;
      font-weight: 700;
      color: #333;
      margin-top: 1mm;
    }

    .barcode-box {
      border: 1.5px solid #000;
      border-radius: 3px;
      padding: 2mm 3mm;
      background: #fafafa;
    }

    .barcode-text {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: #000;
      margin-top: 1mm;
      word-break: break-all;
    }

    .label-subtitle {
      font-size: 0.55rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
    }

    @media print {
      body { background: white; }
      .label-page { background: white; padding: 4mm; }
      @page { margin: 5mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  ${labelsHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=820,height=960,menubar=no,toolbar=no,location=no,status=no');
  if (!printWindow) {
    alert('Bloqueio de popup detectado. Por favor, permita popups para este site e tente novamente.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
}
