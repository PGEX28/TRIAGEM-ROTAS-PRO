const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;
let printAgentProcess = null;

const PORT = process.env.PORT || 3001;
const PRINT_AGENT_PORT = 8181;
const BACKEND_URL = `http://localhost:${PORT}`;

function checkBackendHealth(retries = 30, interval = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts++;
      http
        .get(`${BACKEND_URL}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else if (attempts < retries) {
            setTimeout(check, interval);
          } else {
            reject(new Error('Backend não respondeu a tempo'));
          }
        })
        .on('error', () => {
          if (attempts < retries) {
            setTimeout(check, interval);
          } else {
            reject(new Error('Backend não pôde ser alcançado'));
          }
        });
    };

    check();
  });
}

function startBackend() {
  const isPackaged = app.isPackaged;
  const backendDir = isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.resolve(__dirname, '../../backend');

  const backendEntry = isPackaged
    ? path.join(backendDir, 'dist', 'index.js')
    : path.resolve(__dirname, '../../backend/dist/index.js');

  try {
    backendProcess = spawn(process.execPath, [backendEntry], {
      cwd: backendDir,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: 'production',
        PORT: String(PORT),
      },
      stdio: 'inherit',
    });

    backendProcess.on('error', (err) => {
      console.error('[Rotas Pro] Erro ao iniciar subprocesso do Backend:', err);
    });

    backendProcess.on('exit', (code) => {
      console.log(`[Rotas Pro] Subprocesso do Backend encerrou com código ${code}`);
    });
  } catch (err) {
    console.error('[Rotas Pro] Falha ao disparar backend:', err);
  }
}

function startPrintAgent() {
  const isPackaged = app.isPackaged;
  const agentDir = isPackaged
    ? path.join(process.resourcesPath, 'print-agent')
    : path.resolve(__dirname, '../../print-agent');

  const agentEntry = isPackaged
    ? path.join(agentDir, 'dist', 'server.js')
    : path.resolve(__dirname, '../../print-agent/dist/server.js');

  try {
    printAgentProcess = spawn(process.execPath, [agentEntry], {
      cwd: agentDir,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: 'production',
        PORT: String(PRINT_AGENT_PORT),
      },
      stdio: 'ignore', // Nao travar o console se ja houver porta ativa
    });

    printAgentProcess.on('error', () => {});
    printAgentProcess.on('exit', () => {});
  } catch (err) {}
}

function stopAll() {
  if (backendProcess) {
    console.log('[Rotas Pro] Encerrando Backend...');
    try { backendProcess.kill('SIGTERM'); } catch (e) {
      try { backendProcess.kill('SIGKILL'); } catch (err) {}
    }
    backendProcess = null;
  }

  if (printAgentProcess) {
    console.log('[Rotas Pro] Encerrando Print Agent...');
    try { printAgentProcess.kill('SIGTERM'); } catch (e) {
      try { printAgentProcess.kill('SIGKILL'); } catch (err) {}
    }
    printAgentProcess = null;
  }
}

async function createWindow() {
  // Ocultar menu padrão do navegador para visual nativo profissional
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Rotas Pro — Triagem e Roteirização',
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#090a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // Aguardar backend estar online antes de exibir a janela
  try {
    await checkBackendHealth();
    await mainWindow.loadURL(BACKEND_URL);
    mainWindow.show();
  } catch (err) {
    console.error('[Rotas Pro] Erro de inicialização:', err);
    mainWindow.loadURL(BACKEND_URL);
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startBackend();
  startPrintAgent(); // Iniciar Print Agent junto com o backend
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopAll();
});
