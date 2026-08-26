import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PackageService } from '../services/PackageService';

const router = Router();
router.use(authenticate);

// Scan a package
router.post('/scan', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const { bagId, barcode } = req.body;
    const result = await PackageService.scan(bagId, orgId, barcode, userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Attach address to package
router.post('/:id/address', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const packageId = req.params.id as string;
    const { bagId, recipientName, addressData, ocrConfidence } = req.body;
    
    const result = await PackageService.attachAddress(
      packageId,
      orgId,
      bagId,
      userId,
      recipientName,
      addressData,
      ocrConfidence
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// List packages by bag
router.get('/bag/:bagId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.bagId as string;
    const packages = await PackageService.listByBag(bagId, orgId);
    res.json(packages);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update a package manually
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const packageId = req.params.id as string;
    const updates = req.body;
    const pkg = await PackageService.update(packageId, orgId, updates);
    res.json(pkg);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Mark package as duplicate
router.post('/:id/duplicate', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const packageId = req.params.id as string;
    const { duplicateOfId } = req.body;
    await PackageService.markDuplicate(packageId, duplicateOfId, orgId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
