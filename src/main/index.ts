// T-010a: Overlay window shell and tray.
// T-011: Single instance lock, global hotkey.
// T-012 / D-010: FocusController is the single source of truth for island mode;
//                 blur auto-collapse (300 ms), drag auto-expand (immediate).
// D-009: frameless, transparent, always-on-top BrowserWindow; top-center, 12 px top margin.
// D-017: collapsed 280x40, expanded 420x360.
import { app, BrowserWindow, screen, globalShortcut } from 'electron'
import { join } from 'path'
import log from 'electron-log'
import { AppStore } from './services/store'
import { createTray, destroyTray, setTrayTooltip } from './services/tray'
import { registerHotkey, unregisterHotkey } from './services/hotkey'
import { FocusController, type IslandMode } from './services/focus-controller'
import { registerWeatherHandlers, registerWindowHandlers } from './ipcHandlers'

const COLLAPSED = { width: 280, height: 40 } as const
const EXPANDED = { width: 420, height: 360 } as const

let mainWindow: BrowserWindow | null = null
let focusController: FocusController | null = null

// Singleton store — initialized once on app ready.
export let store: AppStore
export let hotkeyFailed = false

function getTopCenterBounds(width: number): { x: number; y: number } {
  const { bounds } = screen.getPrimaryDisplay()
  const x = Math.round(bounds.x + (bounds.width - width) / 2)
  const y = bounds.y + 12 // 12 px top margin (D-017)
  return { x, y }
}

// Apply a mode change coming from the FocusController (single source of truth).
function applyIslandMode(mode: IslandMode): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const size = mode === 'collapsed' ? COLLAPSED : EXPANDED
  const { x, y } = getTopCenterBounds(size.width)
  mainWindow.setBounds({ x, y, width: size.width, height: size.height })
  mainWindow.webContents.send('window:modeChanged', { mode })
  if (mode === 'collapsed') {
    mainWindow.setFocusable(false)
  } else {
    mainWindow.setFocusable(true)
    mainWindow.focus()
  }
}

function toggleIsland(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !focusController) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  focusController.setMode(focusController.getMode() === 'collapsed' ? 'expanded' : 'collapsed')
}

function createWindow(): BrowserWindow {
  const { x, y } = getTopCenterBounds(COLLAPSED.width)

  const win = new BrowserWindow({
    width: COLLAPSED.width,
    height: COLLAPSED.height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    focusable: false, // start collapsed; FocusController flips this on expand
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

  // T-012 / D-010: route native focus/blur through the controller.
  win.on('focus', () => focusController?.onFocus())
  win.on('blur', () => focusController?.onBlur())
  // Hidden via the tray: drop any pending collapse timer.
  win.on('hide', () => focusController?.dispose())

  win.on('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// FR-002 / D-011: single instance lock BEFORE creating the window or the store.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed() || !focusController) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    focusController.setMode('expanded')
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('com.electron.emoji-island')

    store = new AppStore()

    focusController = new FocusController({
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      setMode: applyIslandMode,
    })
    registerWindowHandlers(focusController)
    registerWeatherHandlers(store)

    mainWindow = createWindow()
    createTray(mainWindow, toggleIsland)

    // FR-003 / D-011: register the global hotkey; on failure keep running with a tray fallback.
    const accel = store.get('settings').hotkey ?? 'Ctrl+Alt+Space'
    const res = registerHotkey(accel, toggleIsland, globalShortcut)
    if (!res.ok) {
      hotkeyFailed = true
      log.warn(`hotkey registration failed: ${res.error}`)
      setTrayTooltip('Emoji Island - hotkey unavailable, use the tray icon')
    }
  })
}

// D-011 (partial): quit cleanly when all windows close (Windows/Linux).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
  }
})

// macOS: recreate window on dock click (not a target platform but keep scaffold safe).
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && (!mainWindow || mainWindow.isDestroyed())) {
    mainWindow = createWindow()
  }
})

// Requirement 5: release all global shortcuts on quit.
app.on('will-quit', () => {
  unregisterHotkey()
  globalShortcut.unregisterAll()
})