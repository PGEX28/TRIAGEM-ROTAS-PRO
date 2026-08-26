import supabase from '../lib/supabase';

interface AuditLogPayload {
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  newData?: Record<string, any>;
  oldData?: Record<string, any>;
}

export class AuditService {
  /**
   * Registra uma ação no banco de dados de auditoria
   */
  static async log(payload: AuditLogPayload) {
    try {
      const { error } = await supabase.from('audit_logs').insert({
        organization_id: payload.orgId,
        user_id: payload.userId,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        new_data: payload.newData,
        old_data: payload.oldData,
      });

      if (error) {
        console.error('Falha ao registrar log de auditoria:', error.message);
      }
    } catch (err) {
      console.error('Erro inesperado no AuditService:', err);
    }
  }
}
