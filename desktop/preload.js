'use strict';

const { contextBridge } = require('electron');

/**
 * Puente seguro (contextIsolation). Expone lo mínimo para que la web pueda
 * detectar que corre dentro del shell nativo y adaptar detalles si hace falta
 * (p. ej. mostrar/ocultar el botón "Instalar app" del PWA).
 */
contextBridge.exposeInMainWorld('escudoDesktop', {
  isDesktop: true,
  platform: process.platform,
  electron: process.versions.electron,
});
