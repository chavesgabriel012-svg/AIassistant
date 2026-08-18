# Escudo Digital — App de escritorio (Electron)

Shell nativo para Windows, macOS y Linux. Carga la app web publicada (Vercel)
dentro de una ventana nativa: reutiliza el 100% de la UI y se actualiza en vivo,
mientras el marco de ventana, el ícono, la barra de tareas/Dock y los menús son
nativos de verdad.

## Cómo funciona

- `main.js` crea la ventana con barra de título integrada (estilo Spotify/Claude)
  y carga `ESCUDO_APP_URL` (por defecto, el dominio de producción).
- Los enlaces externos abren en el navegador del sistema.
- Instancia única, memoria de tamaño/posición, menús en español, aviso si no hay
  internet.

## Desarrollo

```bash
cd desktop
npm install

# Apuntar al sitio de producción:
npm start

# O apuntar a tu Next.js local (levantá antes `npm run dev` en la raíz):
npm run dev
```

> Importante: edita `DEFAULT_URL` en `main.js` con tu dominio real de Vercel.

## Generar instaladores

Cada instalador se construye en su propio sistema operativo (lo mejor para firma):

```bash
npm run dist:win     # Windows -> .exe (NSIS)   [correr en Windows]
npm run dist:mac     # macOS   -> .dmg / .zip    [correr en macOS]
npm run dist:linux   # Linux   -> .AppImage/.deb [correr en Linux]
```

### Vía CI (recomendado, los tres a la vez)

El workflow `.github/workflows/desktop-build.yml` compila los tres en paralelo.
Ejecutar desde **GitHub → Actions → "Desktop build" → Run workflow**, o subir un
tag `desktop-v0.1.0`. Los instaladores quedan como *artifacts* descargables.

## Pendientes (producción)

- **Firma de código**: Windows (certificado EV/OV) y macOS (Apple Developer ID +
  notarización) para que no salten advertencias de seguridad al instalar.
- **Auto-actualización del shell** con `electron-updater` + GitHub Releases
  (el contenido ya se actualiza solo por cargar la web; esto es para el binario).
- **Deep links** (`escudo://`) para el retorno de OAuth dentro de la app.
