const path = require('path')
const electron = require('electron')
const createMenu = require('./menu')
const config = require('./config')
const tray = require('./tray')
const { toggleGlobalShortcut } = require('./utils')

const app = electron.app

require('electron-debug')()
require('electron-context-menu')({
  showInspectElement: true
})

let mainWindow
let isQuitting = false

const isAlreadyRunning = app.makeSingleInstance(() => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.show()
  }
})

if (isAlreadyRunning) {
  app.quit()
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
  }
}

function createMainWindow() {
  const lastWindowState = config.get('lastWindowState')

  const win = new electron.BrowserWindow({
    title: app.getName(),
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width,
    height: lastWindowState.height,
    minWidth: 600,
    minHeight: 400,
    show: false,
    titleBarStyle: 'hidden'
  })

  if (process.platform === 'darwin') {
    win.setSheetOffset(24)
  }

  const url = `file://${path.join(__dirname, 'renderer', 'index.html')}`

  win.loadURL(url)

  win.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()

      if (process.platform === 'darwin') {
        app.hide()
      } else {
        win.hide()
      }
    }
  })

  return win
}

app.on('ready', () => {
  const shortcut = config.get('shortcut')
  for (const name in shortcut) {
    const accelerator = shortcut[name]
    if (accelerator) {
      toggleGlobalShortcut({
        name,
        accelerator,
        registered: false,
        action: toggleWindow
      })
    }
  }

  electron.Menu.setApplicationMenu(
    createMenu({
      toggleWindow
    })
  )
  mainWindow = createMainWindow()
  tray.create(mainWindow)

  const page = mainWindow.webContents
  page.on('dom-ready', () => {
    mainWindow.show()
  })
})

app.on('activate', () => {
  mainWindow.show()
})

app.on('before-quit', () => {
  isQuitting = true

  if (!mainWindow.isFullScreen()) {
    config.set('lastWindowState', mainWindow.getBounds())
  }
})
