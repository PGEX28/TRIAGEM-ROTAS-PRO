import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ExportService } from '../services/ExportService';

const router = Router();
router.use(authenticate);

// Export bag data in structured JSON format
router.get('/bag/:bagId', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.bagId as string;
    const data = await ExportService.exportBagData(bagId, orgId);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Download Circuit-compatible CSV named with the custom bag name
router.get('/bag/:bagId/circuit-csv', async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organization_id;
    const bagId = req.params.bagId as string;
    const data = await ExportService.exportBagData(bagId, orgId);
    const csvContent = ExportService.generateCircuitCsv(data.rows);

    // Extrai o nome limpo do saco colocado na criação (ex: "Rota Campeche" de "#25-08-2026 - Rota Campeche")
    let cleanName = data.bagCode;
    if (cleanName.includes(' - ')) {
      cleanName = cleanName.split(' - ').slice(1).join(' - ').trim();
    }
    cleanName = cleanName.replace(/[\/\\:*?"<>|]/g, '_').trim();
    if (!cleanName) {
      cleanName = data.bagCode.replace(/[\/\\:*?"<>|]/g, '_').trim();
    }

    const filename = `${cleanName}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send('\uFEFF' + csvContent); // UTF-8 BOM for Excel / Circuit compatibility
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
