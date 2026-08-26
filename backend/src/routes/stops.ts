import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import supabase from '../lib/supabase';

const router = Router();
router.use(authenticate);

// Get stops by bag ID
router.get('/bag/:bagId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.bagId;
    
    const { data, error } = await supabase
      .from('stops')
      .select(`
        *,
        address:addresses(street, number, complement, neighborhood, city, state, zip_code)
      `)
      .eq('bag_id', bagId)
      .eq('organization_id', orgId)
      .order('order_number', { ascending: true });

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update stop order
router.put('/:id/order', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const stopId = req.params.id;
    const { order_number } = req.body;
    
    const { data, error } = await supabase
      .from('stops')
      .update({ order_number })
      .eq('id', stopId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
