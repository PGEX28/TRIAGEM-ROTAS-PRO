import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import bagsRouter from './routes/bags';
import packagesRouter from './routes/packages';
import stopsRouter from './routes/stops';
import labelsRouter from './routes/labels';
import printRouter from './routes/print';
import exportRouter from './routes/export';
import importRouter from './routes/import';
import auditRouter from './routes/audit';
import settingsRouter from './routes/settings';
import visionRouter from './routes/vision';

const app = express();

// Security — CSP configurado para permitir Print Agent (8181) e Supabase
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:      ["'self'", "'unsafe-inline'"],
      imgSrc:        ["'self'", "data:", "blob:", "https:"],
      fontSrc:       ["'self'", "data:"],
      connectSrc:    [
        "'self'",
        "http://localhost:8181",   // Print Agent Local
        "https://*.supabase.co",   // Supabase API
        "wss://*.supabase.co",     // Supabase Realtime
      ],
      workerSrc:     ["'self'", "blob:"],
      objectSrc:     ["'none'"],
    },
  },
}));


// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/bags', bagsRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/stops', stopsRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/print', printRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', importRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/vision', visionRouter);

import path from 'path';

// Servir build estático do Frontend em produção
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// Redirecionar rotas não-API para o index.html do React (SPA routing no Express 5)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && req.path !== '/health') {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  next();
});

// 404 para rotas de API
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

export default app;
