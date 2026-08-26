import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ImportService } from '../services/ImportService';

const router = Router();
router.use(authenticate);

// Import batch items into a bag
router.post('/bag/:bagId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const bagId = req.params.bagId as string;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Array "items" não informado ou vazio' });
    }

    const result = await ImportService.importBatch(bagId, orgId, userId, items);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
