const url = require('url')
const path = require('path')
const {
  BrowserWindow, protocol, Menu, shell, ipcMain,
} = require('electron') // eslint-disable-line
const { autoUpdater } = require('electron-updater')
const logger = require("electron-log")

autoUpdater.logger = logger
console.log = logger.log
autoUpdater.logger["transports"].file.level = "info"

const appMenuTemplate = require('./app_menu_template')

module.exports = class HFUIApplication {
  static createWindow() {
    const win = new BrowserWindow({
      width: 1500,
      height: 850,
      icon: path.resolve(__dirname, '../icon.png'),
      show: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    win.loadURL(url.format({
      pathname: 'index.html',
      protocol: 'file',
      slashes: true,
    }))

    return win
  }

  constructor({ app, onExit }) {
    this.mainWindow = null
    this.onExitCB = onExit
    this.app = app

    this.onReady = this.onReady.bind(this)
    this.onActivate = this.onActivate.bind(this)
    this.onAllWindowsClosed = this.onAllWindowsClosed.bind(this)
    this.onMainWindowClosed = this.onMainWindowClosed.bind(this)

    // increase memory size
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048')
    app.on('ready', this.onReady)
    app.on('window-all-closed', this.onAllWindowsClosed)
    app.on('activate', this.onActivate)
  }

  spawnMainWindow() {
    if (this.mainWindow !== null) {
      return
    }

    this.mainWindow = HFUIApplication.createWindow()
    this.mainWindow.on('closed', this.onMainWindowClosed)
    this.mainWindow.on('close', (e) => {
      if (this.mainWindow !== null) {
        e.preventDefault()
        this.mainWindow.webContents.send('app-close')
      }
    })
    this.mainWindow.once('ready-to-show', () => {
      console.log('process.platform: ', process.platform);
      // if (process.platform !== 'darwin') {
        autoUpdater.checkForUpdatesAndNotify();
      // }
    });
    this.mainWindow.webContents.on('new-window', this.handleURLRedirect)

    ipcMain.on('app-closed', () => {
      this.mainWindow.removeAllListeners('close')
      this.mainWindow.close()
    })

    ipcMain.on('restart_app', () => {
      autoUpdater.quitAndInstall();
      this.app.exit();
      // this.app.relaunch()
      // this.app.quit()
    });

    autoUpdater.on('update-available', () => {
      console.log('update-available: ');
      logger.log('update-available: 1');
      this.mainWindow.webContents.send('update_available');
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('update-downloaded: ');
      logger.log('update-downloaded: 1');
      this.mainWindow.webContents.send('update_downloaded');
    });
  }

  handleURLRedirect(event, url) {
    event.preventDefault()
    shell.openExternal(url)
  }

  onReady() {
    protocol.interceptFileProtocol('file', (request, callback) => {
      const fileURL = request.url.substr(7) // all urls start with 'file://'
      callback({ path: path.normalize(`${__dirname}/../${fileURL}`) })
    }, (err) => {
      if (err) {
        console.error('Failed to register protocol')
      }
    })

    Menu.setApplicationMenu(Menu.buildFromTemplate(appMenuTemplate(this.app)))

    this.spawnMainWindow()
  }

  onActivate() {
    this.spawnMainWindow()
  }

  onMainWindowClosed() {
    this.mainWindow = null
  }

  onAllWindowsClosed() {
    this.onExitCB()
    this.app.quit()
  }
}
