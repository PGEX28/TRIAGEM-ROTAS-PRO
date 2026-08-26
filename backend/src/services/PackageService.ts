import supabase from '../lib/supabase';
import { AddressNormalizationService, AddressInput } from './AddressNormalizationService';
import { AuditService } from './AuditService';

interface ScanResult {
  success: boolean;
  package_id?: string;
  stop_id?: string;
  stop_number?: number;
  package_count?: number;
  recipient_name?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  status: string;
  message: string;
  is_duplicate?: boolean;
  is_pending_review?: boolean;
}

export class PackageService {
  /**
   * Processa um bip de código de barras no contexto de um saco.
   * Cria o pacote do zero se não existir.
   */
  static async scan(
    bagId: string,
    orgId: string,
    barcode: string,
    userId: string
  ): Promise<ScanResult> {
    // 1. Registrar scan bruto (sem scanned_by forçado se for demo)
    await supabase.from('scans').insert({
      organization_id: orgId,
      bag_id: bagId,
      raw_code: barcode,
    });

    // 2. Verificar se o saco existe e está aberto
    const { data: bag, error: bagError } = await supabase
      .from('bags')
      .select('id, status')
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .single();

    if (bagError || !bag) {
      return { success: false, status: 'ERROR', message: 'Saco não encontrado' };
    }

    if (!['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(bag.status)) {
      return { success: false, status: 'ERROR', message: 'Saco finalizado. Reabra para adicionar pacotes.' };
    }

    // 3. Se saco está OPEN, mudar para IN_PROGRESS
    if (bag.status === 'OPEN') {
      await supabase
        .from('bags')
        .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
        .eq('id', bagId);
    }

    // 4. Verificar duplicidade dentro do saco
    const { data: existingPkg } = await supabase
      .from('packages')
      .select('id, status, scanned_at, stop_id, recipient_name, address_id')
      .eq('bag_id', bagId)
      .eq('barcode', barcode)
      .single();

    if (existingPkg) {
      // Atualizar scan com resultado duplicado
      await supabase.from('scans').update({ result: 'DUPLICATE', package_id: existingPkg.id })
        .eq('bag_id', bagId).eq('raw_code', barcode).is('result', null);

      return {
        success: false,
        status: 'DUPLICATE',
        is_duplicate: true,
        package_id: existingPkg.id,
        message: `Pacote já bipado neste saco às ${new Date(existingPkg.scanned_at).toLocaleTimeString('pt-BR')}`,
      };
    }

    // 5. Criar pacote novo
    const { data: newPkg, error: pkgError } = await supabase
      .from('packages')
      .insert({
        organization_id: orgId,
        bag_id: bagId,
        barcode,
        status: 'RECEIVED',
        scan_method: 'BARCODE',
        scanned_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (pkgError || !newPkg) {
      return { success: false, status: 'ERROR', message: `Erro ao criar pacote: ${pkgError?.message}` };
    }

    // Atualizar scan
    await supabase.from('scans').update({ result: 'SUCCESS', package_id: newPkg.id })
      .eq('bag_id', bagId).eq('raw_code', barcode).is('result', null);

    await AuditService.log({
      orgId,
      userId,
      action: 'PACKAGE_SCANNED',
      entityType: 'package',
      entityId: newPkg.id,
      newData: { barcode, bag_id: bagId },
    });

    return {
      success: true,
      status: 'RECEIVED',
      package_id: newPkg.id,
      message: 'Pacote criado. Adicione informações de endereço.',
    };
  }

  /**
   * Atualiza pacote com dados de endereço (após OCR ou lookup externo)
   * e faz o agrupamento automático em paradas.
   */
  static async attachAddress(
    packageId: string,
    orgId: string,
    bagId: string,
    userId: string,
    recipientName: string,
    addressData: AddressInput,
    ocrConfidence?: number
  ): Promise<ScanResult> {
    // Upsert endereço
    const { id: addressId, isNew } = await AddressNormalizationService.upsert(orgId, addressData);

    // Encontrar ou criar parada para este endereço no saco
    const { id: stopId, stop_number, isNewStop } = await this.findOrCreateStop(
      orgId, bagId, addressId
    );

    // Determinar status do pacote
    const status = ocrConfidence !== undefined && ocrConfidence < 60
      ? 'PENDING_REVIEW'
      : 'IDENTIFIED';

    // Atualizar pacote
    await supabase
      .from('packages')
      .update({
        recipient_name: recipientName,
        address_id: addressId,
        stop_id: stopId,
        status,
        ocr_confidence: ocrConfidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', packageId);

    // Buscar contagem atualizada da parada
    const { data: stop } = await supabase
      .from('stops')
      .select('package_count')
      .eq('id', stopId)
      .single();

    await AuditService.log({
      orgId,
      userId,
      action: 'PACKAGE_ADDRESSED',
      entityType: 'package',
      entityId: packageId,
      newData: { address_id: addressId, stop_id: stopId, is_new_stop: isNewStop, is_new_address: isNew },
    });

    return {
      success: true,
      status,
      package_id: packageId,
      stop_id: stopId,
      stop_number,
      package_count: stop?.package_count || 1,
      recipient_name: recipientName,
      address: {
        street: addressData.street || '',
        number: addressData.number || '',
        complement: addressData.complement,
        neighborhood: addressData.neighborhood || '',
        city: addressData.city || '',
        state: addressData.state || '',
        zip_code: addressData.zip_code || '',
      },
      is_pending_review: status === 'PENDING_REVIEW',
      message: isNewStop
        ? `Nova parada criada: #${stop_number}`
        : `Vinculado à parada #${stop_number} (${stop?.package_count} pacotes)`,
    };
  }

  /**
   * Encontra parada existente para o endereço no saco, ou cria uma nova
   */
  private static async findOrCreateStop(
    orgId: string,
    bagId: string,
    addressId: string
  ): Promise<{ id: string; stop_number: number; isNewStop: boolean }> {
    // Buscar parada existente para este endereço no saco
    const { data: existingStop } = await supabase
      .from('stops')
      .select('id, stop_number')
      .eq('bag_id', bagId)
      .eq('address_id', addressId)
      .single();

    if (existingStop) {
      return {
        id: existingStop.id,
        stop_number: existingStop.stop_number,
        isNewStop: false,
      };
    }

    // Calcular próximo número de parada
    const { count } = await supabase
      .from('stops')
      .select('*', { count: 'exact', head: true })
      .eq('bag_id', bagId);

    const nextNumber = (count || 0) + 1;

    const { data: newStop, error } = await supabase
      .from('stops')
      .insert({
        organization_id: orgId,
        bag_id: bagId,
        address_id: addressId,
        stop_number: nextNumber,
        order_number: nextNumber,
        package_count: 0,
      })
      .select('id, stop_number')
      .single();

    if (error || !newStop) {
      throw new Error(`Erro ao criar parada: ${error?.message}`);
    }

    return {
      id: newStop.id,
      stop_number: newStop.stop_number,
      isNewStop: true,
    };
  }

  /**
   * Busca lista de pacotes de um saco com joins
   */
  static async listByBag(bagId: string, orgId: string) {
    const { data, error } = await supabase
      .from('packages')
      .select(`
        id, barcode, tracking_code, order_code, recipient_name, status,
        scan_method, ocr_confidence, scanned_at, created_at,
        address:addresses(id, street, number, complement, neighborhood, city, state, zip_code),
        stop:stops(id, stop_number, order_number, package_count)
      `)
      .eq('bag_id', bagId)
      .eq('organization_id', orgId)
      .order('scanned_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Atualiza pacote (edição manual)
   */
  static async update(packageId: string, orgId: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('packages')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', packageId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Marca pacote como duplicado
   */
  static async markDuplicate(packageId: string, duplicateOfId: string, orgId: string) {
    await supabase
      .from('packages')
      .update({ status: 'DUPLICATE', duplicate_of: duplicateOfId })
      .eq('id', packageId)
      .eq('organization_id', orgId);
  }
}
