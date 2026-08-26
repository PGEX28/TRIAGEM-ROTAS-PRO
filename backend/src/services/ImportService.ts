import supabase from '../lib/supabase';
import { PackageService } from './PackageService';
import { AuditService } from './AuditService';

export interface ImportPackageItem {
  barcode: string;
  recipient_name?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export class ImportService {
  /**
   * Importa lote de pacotes com endereços pré-definidos para um saco
   */
  static async importBatch(bagId: string, orgId: string, userId: string, items: ImportPackageItem[]) {
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const item of items) {
      if (!item.barcode) {
        errorCount++;
        continue;
      }

      try {
        // 1. Scan / Criar Pacote
        const scanRes = await PackageService.scan(bagId, orgId, item.barcode.trim(), userId);

        if (scanRes.is_duplicate) {
          duplicateCount++;
          results.push({ barcode: item.barcode, status: 'DUPLICATE' });
          continue;
        }

        if (!scanRes.package_id) {
          errorCount++;
          results.push({ barcode: item.barcode, status: 'ERROR', message: scanRes.message });
          continue;
        }

        // 2. Se houver dados de endereço, vincular imediatamente
        if (item.street || item.zip_code) {
          await PackageService.attachAddress(
            scanRes.package_id,
            orgId,
            bagId,
            userId,
            item.recipient_name || 'Destinatário Importado',
            {
              street: item.street,
              number: item.number,
              complement: item.complement,
              neighborhood: item.neighborhood,
              city: item.city,
              state: item.state,
              zip_code: item.zip_code,
            },
            100
          );
        }

        successCount++;
        results.push({ barcode: item.barcode, status: 'SUCCESS', package_id: scanRes.package_id });
      } catch (err: any) {
        errorCount++;
        results.push({ barcode: item.barcode, status: 'ERROR', message: err.message });
      }
    }

    await AuditService.log({
      orgId,
      userId,
      action: 'BATCH_IMPORTED',
      entityType: 'bag',
      entityId: bagId,
      newData: { total: items.length, successCount, duplicateCount, errorCount },
    });

    return {
      total: items.length,
      successCount,
      duplicateCount,
      errorCount,
      results,
    };
  }
}
