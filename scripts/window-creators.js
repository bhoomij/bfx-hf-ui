'use strict'

const electron = require('electron')
const serve = require('electron-serve')
const path = require('path')
const url = require('url')

const { BrowserWindow } = electron
const isDevEnv = process.env.NODE_ENV === 'development'

const wins = require('./windows')
const ipcs = require('./ipcs')
const {
  showLoadingWindow,
  hideLoadingWindow
} = require('./change-loading-win-visibility-state')
const {
  showWindow,
  centerWindow
} = require('./helpers/manage-window')

// const publicDir = path.join(__dirname, '../bfx-report-ui/build')
// const loadURL = serve({ directory: publicDir })

console.log('__dirname: __dirname: ', __dirname);
const pathToLayouts = path.join(__dirname, 'layouts')
const pathToLayoutAppInit = path.join('', 'app_init.html')

const _createWindow = async (
  {
    pathname = null,
    winName = 'mainWindow'
  } = {},
  props = {}
) => {
  const point = electron.screen.getCursorScreenPoint()
  const {
    bounds,
    workAreaSize
  } = electron.screen.getDisplayNearestPoint(point)
  const {
    width: defaultWidth,
    height: defaultHeight
  } = workAreaSize
  const isMainWindow = winName === 'mainWindow'
  const {
    width = defaultWidth,
    height = defaultHeight,
    x,
    y,
    isMaximized,
    manage
  } = {}
  const _props = {
    autoHideMenuBar: true,
    width,
    height,
    minWidth: 1000,
    minHeight: 650,
    x: !x
      ? bounds.x
      : x,
    y: !y
      ? bounds.y
      : y,
    // icon: path.join(__dirname, '../build/icons/512x512.png'),
    backgroundColor: '#172d3e',
    show: false,
    ...props
  }

  wins[winName] = new BrowserWindow(_props)

  console.log('pathname: ', pathname);
  const startUrl = pathname
  ? url.format({
    pathname,
    protocol: 'file:',
    slashes: true
  })
  : 'app://-'
  console.log('startUrl: ', startUrl);

    console.log('pathname: 111: ', pathname);
  if (!pathname) {
    await loadURL(wins[winName])
  }

  wins[winName].on('closed', () => {
    wins[winName] = null

    if (
      ipcs.serverIpc &&
      typeof ipcs.serverIpc === 'object'
    ) {
      ipcs.serverIpc.kill('SIGINT')
    }
  })

  await wins[winName].loadURL(startUrl)

  const res = {
    isMaximized,
    isMainWindow,
    manage,
    win: wins[winName]
  }

  console.log('pathname: ', pathname);
  if (!pathname) {
    await createLoadingWindow()

    return res
  }
  if (_props.center) {
    centerWindow(wins[winName])
  }

  await showWindow(wins[winName])

  return res
}

const _createChildWindow = async (
  pathname,
  winName,
  opts = {}
) => {
  const {
    width = 500,
    height = 500
  } = { ...opts }

  const point = electron.screen.getCursorScreenPoint()
  const { bounds } = electron.screen.getDisplayNearestPoint(point)
  const x = Math.ceil(bounds.x + ((bounds.width - width) / 2))
  const y = Math.ceil(bounds.y + ((bounds.height - height) / 2))

  const winProps = await _createWindow(
    {
      pathname,
      winName
    },
    {
      minWidth: width,
      minHeight: height,
      x,
      y,
      resizable: false,
      center: true,
      parent: wins.mainWindow,
      frame: false,
      ...opts
    }
  )

  winProps.win.on('closed', () => {
    if (wins.mainWindow) {
      wins.mainWindow.close()
    }

    wins.mainWindow = null
  })

  return winProps
}

// const createMainWindow = async ({
//   pathToUserData,
//   pathToUserDocuments
// }) => {
//   const winProps = await _createWindow()
//   const {
//     win,
//     manage,
//     isMaximized
//   } = winProps

//   if (isDevEnv) {
//     wins.mainWindow.webContents.openDevTools()
//   }

//   createMenu({ pathToUserData, pathToUserDocuments })

//   appStates.isMainWinMaximized = isMaximized

//   manage(win)

//   return winProps
// }

const createLoadingWindow = async () => {
  if (
    wins.loadingWindow &&
    typeof wins.loadingWindow === 'object' &&
    !wins.loadingWindow.isDestroyed() &&
    !wins.loadingWindow.isVisible()
  ) {
    console.log('showLoadingWindow: if');
    await showLoadingWindow()

    return {}
  }
  console.log('showLoadingWindow: else');

  console.log('pathToLayoutAppInit: ', pathToLayoutAppInit);
  const winProps = await _createChildWindow(
    pathToLayoutAppInit,
    'loadingWindow',
    {
      width: 350,
      height: 350,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    }
  )

  return winProps
}

// const createErrorWindow = async (pathname) => {
//   const winProps = await _createChildWindow(
//     pathname,
//     'errorWindow',
//     {
//       height: 200,
//       frame: true
//     }
//   )

//   await hideLoadingWindow()

//   return winProps
// }

module.exports = {
  createLoadingWindow
}
