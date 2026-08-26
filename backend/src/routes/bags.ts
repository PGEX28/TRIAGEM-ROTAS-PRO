import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { BagService } from '../services/BagService';
import { RouteOptimizationService } from '../services/RouteOptimizationService';

const router = Router();
router.use(authenticate);

// Create a new bag
router.post('/', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const { name } = req.body;
    const bag = await BagService.create(orgId, userId, name);
    res.status(201).json(bag);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// List bags
router.get('/', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await BagService.list(orgId, limit, offset);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get active bags
router.get('/active', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bags = await BagService.getActive(orgId);
    res.json(bags);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const stats = await BagService.getDashboardStats(orgId);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get bag by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.id as string;
    const bag = await BagService.getById(bagId, orgId);
    res.json(bag);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Finish bag
router.post('/:id/finish', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const bagId = req.params.id as string;
    const bag = await BagService.finish(bagId, orgId, userId);
    res.json(bag);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Reopen bag
router.post('/:id/reopen', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const bagId = req.params.id as string;
    const { reason } = req.body;
    const bag = await BagService.reopen(bagId, orgId, userId, reason);
    res.json(bag);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete bag
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const bagId = req.params.id as string;
    const bag = await BagService.delete(bagId, orgId, userId);
    res.json({ success: true, deleted: bag });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Optimize delivery route (Nearest Neighbor algorithm)
router.post('/:id/optimize', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.id as string;
    const result = await RouteOptimizationService.optimizeRoute(bagId, orgId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
