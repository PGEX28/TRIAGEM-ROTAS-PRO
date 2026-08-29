import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { extractAddressWithAI } from '../services/AIVisionService';

const router = Router();
router.use(authenticate);

router.post('/extract-address', async (req, res) => {
  const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : '';
  if (!imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Envie uma foto válida da etiqueta.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ available: false, error: 'OCR por IA ainda não está configurado.' });
  }

  try {
    const address = await extractAddressWithAI(imageDataUrl);
    return res.json({ available: true, address });
  } catch (error: any) {
    console.error('Erro no OCR por IA:', error.message);
    return res.status(502).json({ error: 'Não foi possível ler esta etiqueta com IA.' });
  }
});

export default router;
