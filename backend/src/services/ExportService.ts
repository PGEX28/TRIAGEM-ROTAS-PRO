import supabase from '../lib/supabase';

export interface CircuitExportRow {
  tracking_id: string;
  address: string; // Rua + Número (ex: Servidão Coruja Dourada, 174)
  notes: string; // Complemento + Destinatário (ex: Kit net - Dest: Renata Castro)
  neighborhood: string; // Bairro (ex: Campeche)
  city: string; // Cidade (ex: Florianópolis)
  state: string; // Estado (ex: SC)
  zip_code: string; // CEP formatado (ex: 88066-035)
  order_display: string; // "1" ou "2, 3" (ordem dos pacotes na parada)
}

export class ExportService {
  /**
   * Exporta os dados do saco estruturados para o formato do Circuit Route Planner
   */
  static async exportBagData(bagId: string, orgId: string) {
    const { data: bag, error: bagError } = await supabase
      .from('bags')
      .select(`
        id, code, status, created_at, finished_at,
        stops:stops(
          id, stop_number, order_number, package_count,
          address:addresses(id, street, number, complement, neighborhood, city, state, zip_code)
        )
      `)
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .single();

    if (bagError || !bag) {
      throw new Error('Saco não encontrado');
    }

    if (bag.status !== 'FINISHED') {
      throw new Error('O saco precisa ser finalizado antes de exportar a rota para o Circuit');
    }

    const { data: packages } = await supabase
      .from('packages')
      .select('id, barcode, recipient_name, stop_id, created_at')
      .eq('bag_id', bagId)
      .eq('organization_id', orgId)
      .neq('status', 'DUPLICATE');

    const stopsList = bag.stops || [];
    stopsList.sort((a: any, b: any) => (a.order_number || a.stop_number) - (b.order_number || b.stop_number));

    const sortedPackages = [...(packages || [])].sort((a: any, b: any) => {
      const stopA = stopsList.find((s: any) => s.id === a.stop_id);
      const stopB = stopsList.find((s: any) => s.id === b.stop_id);
      const orderA = stopA?.order_number || stopA?.stop_number || 0;
      const orderB = stopB?.order_number || stopB?.stop_number || 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const pkgOrderMap = new Map<string, number>();
    sortedPackages.forEach((pkg, idx) => {
      pkgOrderMap.set(pkg.id, idx + 1);
    });

    const rows: CircuitExportRow[] = [];

    for (const stop of stopsList) {
      const stopPkgs = (packages || []).filter((p: any) => p.stop_id === stop.id);
      const addr: any = stop.address || {};
      const street = (addr.street || '').trim();
      const number = (addr.number || '').trim();
      const neighborhood = (addr.neighborhood || '').trim();
      const city = (addr.city || 'Florianópolis').trim();
      const state = (addr.state || 'SC').trim();
      const zipCode = (addr.zip_code || '').trim();

      const streetAddress = number ? `${street}, ${number}` : street;

      // Gerar sequência de etiquetas/ordem: "1" ou "2, 3"
      const orderNumbers = stopPkgs
        .map((p: any) => pkgOrderMap.get(p.id))
        .filter((n: any): n is number => typeof n === 'number')
        .sort((a: number, b: number) => a - b);

      const orderDisplay = orderNumbers.length > 0 ? orderNumbers.join(', ') : String(stop.order_number || stop.stop_number);

      const recipients = Array.from(new Set(stopPkgs.map((p: any) => p.recipient_name).filter(Boolean)));
      const recipientStr = recipients.length > 0 ? `Dest: ${recipients.join(' / ')}` : '';
      const notesParts = [addr.complement, recipientStr].filter(Boolean);
      const notes = notesParts.join(' | ');

      rows.push({
        tracking_id: bag.code.split(' - ')[0].replace('#', ''),
        address: streetAddress,
        notes,
        neighborhood,
        city,
        state,
        zip_code: zipCode,
        order_display: orderDisplay,
      });
    }

    return {
      bagCode: bag.code,
      totalStops: stopsList.length,
      totalPackages: (packages || []).length,
      rows,
    };
  }

  /**
   * Converte lista de linhas para arquivo CSV/TSV formatado com as colunas completas para o Circuit
   */
  static generateCircuitCsv(rows: CircuitExportRow[]): string {
    const headers = [
      'Destination Address',
      'Address Line 2',
      'Bairro',
      'City',
      'State',
      'Zipcode/Postal code',
      'Pacotes na Parada',
    ];

    const lines = [
      headers.join('\t'),
      ...rows.map((r) =>
        [
          r.address,
          r.notes,
          r.neighborhood,
          r.city,
          r.state,
          r.zip_code,
          r.order_display,
        ].join('\t')
      ),
    ];

    return lines.join('\r\n');
  }
}
