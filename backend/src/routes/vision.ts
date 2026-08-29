import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { extractAddressWithAI } from '../services/AIVisionService';
import { extractAddressWithGemini } from '../services/GeminiVisionService';

const router = Router();
router.use(authenticate);

router.post('/extract-address', async (req, res) => {
  const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : '';
  if (!imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Envie uma foto válida da etiqueta.' });
  }

  const provider = process.env.GEMINI_API_KEY ? 'Gemini' : process.env.OPENAI_API_KEY ? 'OpenAI' : null;
  if (!provider) {
    return res.status(503).json({ available: false, error: 'OCR por IA ainda não está configurado.' });
  }

  try {
    const address = provider === 'Gemini'
      ? await extractAddressWithGemini(imageDataUrl)
      : await extractAddressWithAI(imageDataUrl);
    return res.json({ available: true, provider, address });
  } catch (error: any) {
    console.error(`Erro no OCR por IA (${provider}):`, error.message);
    return res.status(502).json({ error: `${provider} não conseguiu ler esta etiqueta. ${error.message}` });
  }
});

export default router;
