import 'dotenv/config';
import ws from 'ws';

// Polyfill global WebSocket para ambientes Node.js
(globalThis as any).WebSocket = ws;
(global as any).WebSocket = ws;

import app from './app';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`\n🚀 Rotas Pro Backend rodando na porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL}\n`);
});
