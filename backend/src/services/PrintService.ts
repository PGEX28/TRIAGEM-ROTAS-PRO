import supabase from '../lib/supabase';
import { AuditService } from './AuditService';

export interface CreatePrintJobPayload {
  orgId: string;
  userId: string;
  bagId?: string;
  packageId?: string;
  printerId?: string;
  labelData: Record<string, any>;
  copies?: number;
}

export class PrintService {
  /**
   * Enfileira um job de impressão no banco de dados
   */
  static async enqueueJob(payload: CreatePrintJobPayload) {
    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        organization_id: payload.orgId,
        bag_id: payload.bagId,
        package_id: payload.packageId,
        printer_id: payload.printerId,
        label_data: payload.labelData,
        status: 'QUEUED',
        copies: payload.copies || 1,
        created_by: payload.userId,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Erro ao enfileirar job de impressão: ${error?.message}`);
    }

    // Se tiver packageId, atualizar status do pacote para PRINTED
    if (payload.packageId) {
      await supabase
        .from('packages')
        .update({ status: 'PRINTED', updated_at: new Date().toISOString() })
        .eq('id', payload.packageId)
        .eq('organization_id', payload.orgId);
    }

    // Se for por saco, atualizar todos os pacotes do saco para PRINTED
    if (payload.bagId && !payload.packageId) {
      await supabase
        .from('packages')
        .update({ status: 'PRINTED', updated_at: new Date().toISOString() })
        .eq('bag_id', payload.bagId)
        .eq('organization_id', payload.orgId)
        .neq('status', 'DUPLICATE');
    }

    await AuditService.log({
      orgId: payload.orgId,
      userId: payload.userId,
      action: 'PRINT_JOB_QUEUED',
      entityType: 'print_job',
      entityId: data.id,
      newData: { bagId: payload.bagId, packageId: payload.packageId },
    });

    return data;
  }

  /**
   * Lista jobs de impressão recentes
   */
  static async listRecentJobs(orgId: string, limit = 20) {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('organization_id', orgId)
      .order('queued_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Atualiza status do job
   */
  static async updateJobStatus(jobId: string, orgId: string, status: string, errorMessage?: string) {
    const updates: Record<string, any> = { status };
    if (status === 'PRINTED') {
      updates.printed_at = new Date().toISOString();
    }
    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .update(updates)
      .eq('id', jobId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
