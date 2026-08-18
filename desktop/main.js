'use strict';

const { app, BrowserWindow, shell, Menu, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Escudo Digital — shell de escritorio (Electron).
 *
 * Estrategia: cargar la app web publicada (Vercel) en una ventana NATIVA. Así
 * se reutiliza el 100% de la UI y la app sigue actualizándose en vivo (carga
 * siempre la última versión del sitio), mientras el marco de ventana, el ícono
 * del sistema, el Dock/Barra de tareas y los menús son nativos de verdad.
 *
 * La URL se puede sobreescribir con la variable de entorno ESCUDO_APP_URL
 * (útil para desarrollo: ESCUDO_APP_URL=http://localhost:3000).
 */

// Dominio de producción (Vercel).
const DEFAULT_URL = 'https://a-iassistant-phi.vercel.app';
const APP_URL = process.env.ESCUDO_APP_URL || DEFAULT_URL;
const APP_ORIGIN = safeOrigin(APP_URL);

const isMac = process.platform === 'darwin';
const BG = '#090b12';

// --- Persistencia simple del tamaño/posición de la ventana -----------------
function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { width: 1280, height: 820 };
  }
}
function saveState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify(b));
  } catch {}
}

let mainWindow = null;

function createWindow() {
  const state = loadState();

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width || 1280,
    height: state.height || 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: BG,
    show: false,
    // Barra de título nativa integrada (estilo Spotify/Claude).
    titleBarStyle: 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 16, y: 18 } }
      : {
          titleBarOverlay: { color: BG, symbolColor: '#e8eaf0', height: 48 },
        }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // En macOS la barra oculta no expone las env vars de WCO; inyectamos un
  // padding para que los "semáforos" no tapen el contenido de la barra.
  if (isMac) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents
        .insertCSS('.app-titlebar{padding-left:84px !important;}')
        .catch(() => {});
    });
  }

  // Abrir enlaces externos en el navegador del sistema, no dentro de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (safeOrigin(url) !== APP_ORIGIN) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (safeOrigin(url) !== APP_ORIGIN) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Si el sitio no carga (sin internet), mostrar un aviso simple.
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, validatedURL, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = abort, ignorable
    mainWindow.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(offlineHtml(desc)),
    );
  });

  const persist = () => saveState(mainWindow);
  mainWindow.on('resize', persist);
  mainWindow.on('move', persist);
  mainWindow.on('close', persist);
  mainWindow.on('closed', () => (mainWindow = null));
}

// --- Instancia única -------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    nativeTheme.themeSource = 'dark';
    buildMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

// --- Menú de aplicación ----------------------------------------------------
function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        ...(process.env.NODE_ENV === 'development'
          ? [{ role: 'toggleDevTools', label: 'Herramientas de desarrollo' }]
          : []),
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- Utilidades ------------------------------------------------------------
function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function offlineHtml(desc) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{height:100%;margin:0;background:${BG};color:#e8eaf0;
      font-family:system-ui,sans-serif;display:grid;place-items:center;text-align:center}
    .box{max-width:360px;padding:2rem}
    button{margin-top:1rem;padding:.6rem 1.2rem;border:0;border-radius:.8rem;
      background:#608dff;color:#fff;font-size:.95rem;cursor:pointer}
  </style></head><body><div class="box">
    <h2>Sin conexión</h2>
    <p style="color:#8c94a7">Escudo Digital necesita internet para funcionar.<br>${desc || ''}</p>
    <button onclick="location.href='${APP_URL}'">Reintentar</button>
  </div></body></html>`;
}
