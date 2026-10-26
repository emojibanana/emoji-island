// T-010a: System Tray — Show/Hide toggle and Quit.
import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

// T-011: allow index.ts to change the tooltip when the hotkey fails.
export function setTrayTooltip(tooltip: string): void {
  tray?.setToolTip(tooltip)
}

export function createTray(win: BrowserWindow, onToggle: () => void): void {
  // Placeholder icon: 16x16 gray circle PNG bundled in resources/.
  // ponytail: replace with a real icon in T-033 / final branding pass.
  const iconPath = join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Emoji Island')

  // T-011: clicking the tray icon toggles the island — working fallback when the hotkey is unavailable.
  tray.on('click', onToggle)

  const buildMenu = (): void => {
    const visible = win.isVisible()
    tray!.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: visible ? 'Hide' : 'Show',
          click: () => {
            if (win.isVisible()) {
              win.hide()
            } else {
              win.show()
            }
            buildMenu()
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            app.quit()
          },
        },
      ]),
    )
  }

  buildMenu()

  // Keep Show/Hide label in sync when window visibility changes.
  win.on('show', buildMenu)
  win.on('hide', buildMenu)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
