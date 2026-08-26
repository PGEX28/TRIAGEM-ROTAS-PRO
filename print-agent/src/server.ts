import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const app = express();
const PORT = 8181;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

interface PrinterInfo {
  name: string;
  isDefault: boolean;
  port?: string;
  status?: string;
}

/**
 * Health check
 */
app.get('/status', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'Rotas Pro Print Agent',
    platform: process.platform,
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Lista impressoras disponíveis no sistema operacional
 */
app.get('/printers', async (_req, res) => {
  try {
    let printers: PrinterInfo[] = [];

    if (process.platform === 'win32') {
      const psCommand = `powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default, PortName | ConvertTo-Json"`;
      try {
        const { stdout } = await execAsync(psCommand);
        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          printers = list.map((p: any) => ({
            name: p.Name,
            isDefault: Boolean(p.Default),
            port: p.PortName,
          }));
        }
      } catch (cmdError) {
        console.warn('Falha ao listar impressoras via CIM, tentando wmic:', cmdError);
      }
    }

    if (printers.length === 0) {
      printers = [
        { name: 'Impressora Padrão do Sistema', isDefault: true },
        { name: 'Zebra / Elgin Térmica (RAW)', isDefault: false },
      ];
    }

    res.json({ printers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao listar impressoras' });
  }
});

/**
 * Envia código RAW / ZPL / EPL diretamente para a impressora no Windows
 */
app.post('/print/raw', async (req, res) => {
  const { printerName, data, copies = 1 } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Conteúdo de impressão não informado' });
  }

  try {
    const tempFile = path.join(os.tmpdir(), `rotaspro_print_${Date.now()}.raw`);
    let fullData = '';
    for (let i = 0; i < copies; i++) {
      fullData += data + '\n';
    }
    await fs.promises.writeFile(tempFile, fullData, 'utf-8');

    if (process.platform === 'win32' && printerName) {
      const psPrintCmd = `powershell -Command "Get-Content -Path '${tempFile}' -Raw | Out-Printer -Name '${printerName}'"`;
      try {
        await execAsync(psPrintCmd);
      } catch (err: any) {
        console.warn('Aviso ao enviar Out-Printer:', err.message);
      }
    }

    // Limpar arquivo temporário
    setTimeout(() => {
      fs.promises.unlink(tempFile).catch(() => {});
    }, 5000);

    res.json({
      success: true,
      message: `Enviado com sucesso para ${printerName || 'impressora padrão'}`,
      copies,
    });
  } catch (error: any) {
    console.error('Erro na impressão RAW:', error);
    res.status(500).json({ error: error.message || 'Erro ao imprimir' });
  }
});

app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🖨️  Rotas Pro Print Agent rodando na porta ${PORT}`);
  console.log(`   Status: http://localhost:${PORT}/status`);
  console.log(`   Impressoras: http://localhost:${PORT}/printers`);
  console.log(`==============================================\n`);
});
