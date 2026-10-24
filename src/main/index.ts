// T-010a: Overlay window shell and tray.
// D-009: frameless, transparent, always-on-top BrowserWindow; top-center, 12 px top margin.
// D-017: collapsed 280x40.
import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { AppStore } from './services/store'
import { createTray, destroyTray } from './services/tray'

// Singleton store — initialized once on app ready.
export let store: AppStore

function getTopCenterBounds(width: number, _height: number): { x: number; y: number } {
  const { bounds } = screen.getPrimaryDisplay()
  const x = Math.round(bounds.x + (bounds.width - width) / 2)
  const y = bounds.y + 12 // 12 px top margin (D-017)
  return { x, y }
}

function createWindow(): BrowserWindow {
  const width = 280
  const height = 40
  const { x, y } = getTopCenterBounds(width, height)

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  // D-009: use 'screen-saver' level so it floats above normal always-on-top windows.
  win.setAlwaysOnTop(true, 'screen-saver')

  // Block renderer-initiated navigation and new window opens.
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' as const }))

  win.on('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.electron.emoji-island')

  store = new AppStore()

  const win = createWindow()
  createTray(win)
})

// D-011 (partial): quit cleanly when all windows close (Windows/Linux).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
  }
})

// macOS: recreate window on dock click (not a target platform but keep scaffold safe).
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})