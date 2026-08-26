import { get, set } from 'idb-keyval';
import { api } from '../lib/api';

const QUEUE_KEY = 'caponi_offline_scans';

export interface OfflineScan {
  id: string;
  bagId: string;
  barcode: string;
  timestamp: string;
}

export class OfflineQueueService {
  /**
   * Adiciona um bip na fila offline do IndexedDB
   */
  static async enqueue(bagId: string, barcode: string): Promise<void> {
    const queue: OfflineScan[] = (await get(QUEUE_KEY)) || [];
    const item: OfflineScan = {
      id: `${Date.now()}_${Math.random()}`,
      bagId,
      barcode,
      timestamp: new Date().toISOString(),
    };
    queue.push(item);
    await set(QUEUE_KEY, queue);
  }

  /**
   * Retorna os itens pendentes na fila
   */
  static async getQueue(): Promise<OfflineScan[]> {
    return (await get(QUEUE_KEY)) || [];
  }

  /**
   * Limpa a fila
   */
  static async clear(): Promise<void> {
    await set(QUEUE_KEY, []);
  }

  /**
   * Sincroniza todos os bips offline com a API
   */
  static async sync(): Promise<{ synced: number; failed: number }> {
    const queue = await this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: OfflineScan[] = [];

    for (const item of queue) {
      try {
        await api.post('/packages/scan', { bagId: item.bagId, barcode: item.barcode });
        synced++;
      } catch {
        failed++;
        remaining.push(item);
      }
    }

    await set(QUEUE_KEY, remaining);
    return { synced, failed };
  }
}
