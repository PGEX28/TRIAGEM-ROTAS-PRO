import supabase from '../lib/supabase';
import { AuditService } from './AuditService';

export class BagService {
  /**
   * Gera código único para o saco no formato: #(DD-MM-YYYY) - (NOME DO SACO)
   */
  static async create(orgId: string, userId?: string, customName?: string) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const baseName = customName?.trim() || 'Lote Principal';
    let code = `#${dateStr} - ${baseName}`;

    // Verificar se já existe um saco com este código hoje e adicionar sufixo para evitar erro de chave única
    const { count } = await supabase
      .from('bags')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .ilike('code', `#${dateStr} - ${baseName}%`);

    if (count && count > 0) {
      code = `#${dateStr} - ${baseName} (${count + 1})`;
    }

    const insertPayload: Record<string, any> = {
      organization_id: orgId,
      code,
      status: 'OPEN',
    };

    const { data, error } = await supabase
      .from('bags')
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) throw new Error(`Erro ao criar saco: ${error?.message}`);

    await AuditService.log({
      orgId,
      userId: userId || '00000000-0000-0000-0000-000000000001',
      action: 'BAG_CREATED',
      entityType: 'bag',
      entityId: data.id,
      newData: { code },
    });

    return data;
  }

  /**
   * Busca saco por ID com contagens
   */
  static async getById(bagId: string, orgId: string) {
    const { data, error } = await supabase
      .from('bags')
      .select(`
        *,
        stops:stops(
          id, stop_number, order_number, package_count, status,
          address:addresses(street, number, complement, neighborhood, city, state, zip_code)
        )
      `)
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Lista sacos da organização
   */
  static async list(orgId: string, limit = 50, offset = 0) {
    const { data, error, count } = await supabase
      .from('bags')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return { data, count };
  }

  /**
   * Finaliza saco — congela pacotes, calcula quantidades definitivas
   */
  static async finish(bagId: string, orgId: string, userId: string) {
    const { data: bag } = await supabase
      .from('bags')
      .select('status, pending_count')
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .single();

    if (!bag) throw new Error('Saco não encontrado');
    if (bag.status === 'FINISHED') throw new Error('Saco já finalizado');

    // 1. Otimizar rota de entrega automaticamente agrupando e ordenando por proximidade geográfica
    try {
      const { RouteOptimizationService } = await import('./RouteOptimizationService');
      await RouteOptimizationService.optimizeRoute(bagId, orgId);
    } catch (optErr) {
      console.warn('Aviso: Falha ao otimizar rota automaticamente:', optErr);
    }

    // Atualizar status das paradas para LABELS_GENERATED implicitly
    // Atualizar pacotes IDENTIFIED -> CONFIRMED
    await supabase
      .from('packages')
      .update({ status: 'CONFIRMED' })
      .eq('bag_id', bagId)
      .eq('status', 'IDENTIFIED');

    // Finalizar saco
    const { data, error } = await supabase
      .from('bags')
      .update({
        status: 'FINISHED',
        finished_at: new Date().toISOString(),
      })
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await AuditService.log({
      orgId,
      userId,
      action: 'BAG_FINISHED',
      entityType: 'bag',
      entityId: bagId,
    });

    return data;
  }

  /**
   * Reabre saco (apenas supervisor/admin)
   */
  static async reopen(bagId: string, orgId: string, userId: string, reason: string) {
    const { data, error } = await supabase
      .from('bags')
      .update({ status: 'REOPENED', finished_at: null })
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Reverter CONFIRMED -> IDENTIFIED para permitir reprocessamento
    await supabase
      .from('packages')
      .update({ status: 'IDENTIFIED' })
      .eq('bag_id', bagId)
      .eq('status', 'CONFIRMED');

    await AuditService.log({
      orgId,
      userId,
      action: 'BAG_REOPENED',
      entityType: 'bag',
      entityId: bagId,
      newData: { reason },
    });

    return data;
  }

  /**
   * Deleta saco e seus pacotes/paradas/scans associados
   */
  static async delete(bagId: string, orgId: string, userId: string) {
    // 1. Deletar registros de scans brutos do saco
    await supabase
      .from('scans')
      .delete()
      .eq('bag_id', bagId)
      .eq('organization_id', orgId);

    // 2. Deletar pacotes do saco
    await supabase
      .from('packages')
      .delete()
      .eq('bag_id', bagId)
      .eq('organization_id', orgId);

    // 3. Deletar paradas do saco
    await supabase
      .from('stops')
      .delete()
      .eq('bag_id', bagId)
      .eq('organization_id', orgId);

    // 4. Deletar o saco
    const { data, error } = await supabase
      .from('bags')
      .delete()
      .eq('id', bagId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await AuditService.log({
      orgId,
      userId,
      action: 'BAG_DELETED',
      entityType: 'bag',
      entityId: bagId,
    });

    return data;
  }

  /**
   * Busca sacos em andamento (OPEN ou IN_PROGRESS)
   */
  static async getActive(orgId: string) {
    const { data } = await supabase
      .from('bags')
      .select('*')
      .eq('organization_id', orgId)
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Estatísticas do dashboard
   */
  static async getDashboardStats(orgId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [bagsRes, packagesRes, stopsRes, pendingRes, printedRes] = await Promise.all([
      supabase.from('bags').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).gte('created_at', todayStart.toISOString()),
      supabase.from('packages').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).gte('created_at', todayStart.toISOString())
        .neq('status', 'DUPLICATE'),
      supabase.from('stops').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).gte('created_at', todayStart.toISOString()),
      supabase.from('packages').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).gte('created_at', todayStart.toISOString())
        .in('status', ['PENDING_REVIEW', 'ERROR']),
      supabase.from('packages').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).gte('created_at', todayStart.toISOString())
        .in('status', ['PRINTED', 'CONFIRMED']),
    ]);

    return {
      bags_today: bagsRes.count || 0,
      packages_today: packagesRes.count || 0,
      stops_today: stopsRes.count || 0,
      pending_today: pendingRes.count || 0,
      printed_today: printedRes.count || 0,
    };
  }
}
