import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PrintService } from '../services/PrintService';
import { LabelService } from '../services/LabelService';

const router = Router();
router.use(authenticate);

// List recent print jobs
router.get('/jobs', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const limit = parseInt(req.query.limit as string) || 20;
    const jobs = await PrintService.listRecentJobs(orgId, limit);
    res.json(jobs);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Enqueue print job for entire bag
router.post('/bag/:bagId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const bagId = req.params.bagId as string;
    const { printerId, copies } = req.body;

    const labels = await LabelService.getLabelsForBag(bagId, orgId);

    const job = await PrintService.enqueueJob({
      orgId,
      userId,
      bagId,
      printerId,
      copies: copies || 1,
      labelData: { count: labels.length, labels },
    });

    res.json({
      success: true,
      job,
      labels,
      message: `${labels.length} etiquetas enfileiradas para impressão`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Enqueue print job for specific package / label
router.post('/package/:packageId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const packageId = req.params.packageId as string;
    const { bagId, printerId, copies, labelData } = req.body;

    const job = await PrintService.enqueueJob({
      orgId,
      userId,
      bagId,
      packageId,
      printerId,
      copies: copies || 1,
      labelData: labelData || {},
    });

    res.json({
      success: true,
      job,
      message: 'Etiqueta enfileirada com sucesso',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
