import supabase from '../lib/supabase';

export interface LabelData {
  packageId: string;
  bagId: string;
  bagCode: string;
  stopId: string;
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

export class LabelService {
  /**
   * Gera a lista de etiquetas estruturadas para um saco finalizado ou em andamento
   */
  static async getLabelsForBag(bagId: string, orgId: string): Promise<LabelData[]> {
    // 1. Buscar dados do saco
    const { data: bag, error: bagError } = await supabase
      .from('bags')
      .select('id, code')
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .single();

    if (bagError || !bag) {
      throw new Error('Saco não encontrado');
    }

    // 2. Buscar pacotes com suas paradas e endereços
    const { data: packages, error: pkgError } = await supabase
      .from('packages')
      .select(`
        id, barcode, tracking_code, recipient_name,
        stop_id,
        stop:stops(id, stop_number, order_number, package_count),
        address:addresses(street, number, complement, neighborhood, city, state, zip_code)
      `)
      .eq('bag_id', bagId)
      .eq('organization_id', orgId)
      .neq('status', 'DUPLICATE')
      .order('created_at', { ascending: true });

    if (pkgError) {
      throw new Error(`Erro ao buscar pacotes: ${pkgError.message}`);
    }

    if (!packages || packages.length === 0) {
      return [];
    }

    // 3. Ordenar pacotes agrupados por parada otimizada (stops.order_number)
    const sortedPackages = [...packages].sort((a: any, b: any) => {
      const orderA = a.stop?.order_number || a.stop?.stop_number || 0;
      const orderB = b.stop?.order_number || b.stop?.stop_number || 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const stopPackageCounters = new Map<string, number>();

    const labels: LabelData[] = sortedPackages.map((pkg: any, index: number) => {
      const stopId = pkg.stop_id || 'unassigned';
      const currentCount = (stopPackageCounters.get(stopId) || 0) + 1;
      stopPackageCounters.set(stopId, currentCount);

      const stopNumber = pkg.stop?.stop_number || 0;
      // ORDEM é única e sequencial para cada pacote físico (1, 2, 3...)
      const packageOrderNumber = index + 1;
      const volumeTotal = pkg.stop?.package_count || currentCount;
      const recipientName = pkg.recipient_name || 'Destinatário não informado';

      const addr = pkg.address || {
        street: 'Endereço não informado',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
      };

      const qrCodeData = JSON.stringify({
        bag: bag.code,
        ordem: packageOrderNumber,
        parada: stopNumber,
        vol: `${currentCount}/${volumeTotal}`,
        code: pkg.barcode,
        cep: addr.zip_code,
      });

      const zpl = this.generateZPL({
        bagCode: bag.code,
        stopNumber,
        orderNumber: packageOrderNumber,
        volumeIndex: currentCount,
        volumeTotal,
        recipientName,
        address: {
          street: addr.street,
          number: addr.number,
          complement: addr.complement,
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zip_code,
        },
        barcode: pkg.barcode,
      });

      return {
        packageId: pkg.id,
        bagId: bag.id,
        bagCode: bag.code,
        stopId,
        stopNumber,
        orderNumber: packageOrderNumber,
        volumeIndex: currentCount,
        volumeTotal,
        recipientName,
        address: {
          street: addr.street,
          number: addr.number,
          complement: addr.complement,
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zip_code,
        },
        barcode: pkg.barcode,
        trackingCode: pkg.tracking_code,
        qrCodeData,
        zpl,
      };
    });

    return labels;
  }

  /**
   * Gera código ZPL para impressoras térmicas (Zebra/Argox/Elgin) padrão 100x150mm (812x1218 dots a 203 DPI)
   */
  static generateZPL(data: {
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
  }): string {
    const fullStreet = `${data.address.street}, ${data.address.number}${data.address.complement ? ' - ' + data.address.complement : ''}`;
    const cityState = `${data.address.neighborhood} - ${data.address.city}/${data.address.state}`;

    return `
^XA
^PW812
^LL1218
^LH0,0

^FO30,30^GB752,1158,4^FS

^FO50,50^A0N,30,30^FDORDEM^FS
^FO50,90^A0N,130,130^FD${String(data.orderNumber).padStart(2, '0')}^FS

^FO400,50^A0N,35,35^FDPARADA #${String(data.stopNumber).padStart(2, '0')}^FS
^FO400,95^A0N,45,45^FDVOL ${data.volumeIndex}/${data.volumeTotal}^FS
^FO400,150^A0N,28,28^FD${data.bagCode.slice(0, 24)}^FS
^FO30,230^GB752,4,4^FS

^FO50,250^BQN,2,5^FDQA,{"bag":"${data.bagCode}","ordem":${data.orderNumber},"parada":${data.stopNumber},"vol":"${data.volumeIndex}/${data.volumeTotal}","code":"${data.barcode}"}^FS
^FO260,260^A0N,26,26^FDDESTINATARIO:^FS
^FO260,295^A0N,34,34^FD${data.recipientName.slice(0, 26)}^FS
^FO260,340^A0N,32,32^FDCEP: ${data.address.zipCode}^FS

^FO30,420^GB752,4,4^FS

^FO50,440^A0N,26,26^FDENDERECO DE ENTREGA:^FS
^FO50,475^A0N,34,34^FD${fullStreet.slice(0, 38)}^FS
^FO50,520^A0N,30,30^FD${cityState.slice(0, 38)}^FS

^XZ
    `.trim();
  }
}
