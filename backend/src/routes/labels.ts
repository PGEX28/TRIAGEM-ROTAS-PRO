import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LabelService } from '../services/LabelService';

const router = Router();
router.use(authenticate);

// Generate / Get labels for a bag
router.get('/bag/:bagId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.bagId as string;
    
    const labels = await LabelService.getLabelsForBag(bagId, orgId);
    res.json(labels);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Alias for generating labels for a bag (idempotent)
router.post('/generate/:bagId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.bagId as string;
    
    const labels = await LabelService.getLabelsForBag(bagId, orgId);
    res.json({
      success: true,
      count: labels.length,
      data: labels,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
