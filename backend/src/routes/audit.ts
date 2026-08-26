import { Router } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import supabase from '../lib/supabase';

const router = Router();
router.use(authenticate);

// Get audit logs (for admin and supervisor)
router.get('/', requireRole('admin', 'supervisor'), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    res.json({ data, count });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
