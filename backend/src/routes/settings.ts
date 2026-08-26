import { Router } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import supabase from '../lib/supabase';

const router = Router();
router.use(authenticate);

// Get organization settings
router.get('/', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    // Default settings if not created yet
    const settings = data || {
      organization_id: orgId,
      operation_name: 'Triagem Principal',
      auto_print: false,
      sound_enabled: true,
      auto_group: true,
      ocr_min_confidence: 60,
      label_width_mm: 100,
      label_height_mm: 150,
      export_format: 'CSV',
    };

    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update organization settings (admin or supervisor)
router.put('/', requireRole('admin', 'supervisor'), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        organization_id: orgId,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
