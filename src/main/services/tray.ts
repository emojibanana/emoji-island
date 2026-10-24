// T-010a: System Tray — Show/Hide toggle and Quit.
import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(win: BrowserWindow): void {
  // Placeholder icon: 16x16 gray circle PNG bundled in resources/.
  // ponytail: replace with a real icon in T-033 / final branding pass.
  const iconPath = join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Emoji Island')

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
