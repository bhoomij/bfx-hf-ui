const { BrowserWindow, ipcMain } = require('electron')
const logger = require('electron-log')

const wins = require('./windows')
const {
  hideWindow,
  showWindow,
  centerWindow,
} = require('./helpers/manage-window')

let intervalMarker

const _closeAllWindows = () => {
  const _wins = BrowserWindow.getAllWindows()
    .filter((win) => win !== wins.loadingWindow)

  const promises = _wins.map((win) => hideWindow(win))

  return Promise.all(promises)
}

const _setParentWindow = (noParent) => {
  logger.log('_setParentWindow: ', noParent);
  logger.log('wins.loadingWindow.isFocused(): ', wins.loadingWindow.isFocused());
  if (wins.loadingWindow.isFocused()) {
    return
  }

  const win = BrowserWindow.getFocusedWindow()

  if (
    noParent
    || Object.values(wins).every((w) => w !== win)
  ) {
    wins.loadingWindow.setParentWindow(null)

    return
  }

  wins.loadingWindow.setParentWindow(win)
}

const _runProgressLoader = (opts = {}) => {
  const {
    win = wins.loadingWindow,
    isIndeterminateMode = false,
  } = { ...opts }

  if (
    !win
    || typeof win !== 'object'
    || win.isDestroyed()
  ) {
    return
  }
  if (isIndeterminateMode) {
    // Change to indeterminate mode when progress > 1
    win.setProgressBar(2)

    return
  }

  const fps = 50
  const duration = 3000 // ms
  const interval = duration / fps // ms
  const step = 1 / (duration / interval)
  let progress = 0

  intervalMarker = setInterval(() => {
    if (progress >= 1) {
      progress = 0
    }

    progress += step

    if (
      !win
      || typeof win !== 'object'
      || win.isDestroyed()
    ) {
      clearInterval(intervalMarker)

      return
    }

    win.setProgressBar(progress)
  }, interval).unref()
}

const _stopProgressLoader = (
  win = wins.loadingWindow,
) => {
  clearInterval(intervalMarker)

  if (
    !win
    || typeof win !== 'object'
    || win.isDestroyed()
  ) {
    return
  }

  // Remove progress bar when progress < 0
  win.setProgressBar(-1)
}

const _setLoadingDescription = (win, description) => {
  return new Promise((resolve) => {
    try {
      if (
        !win
        || typeof win !== 'object'
        || win.isDestroyed()
        || typeof description !== 'string'
      ) {
        resolve()

        return
      }

      ipcMain.once('loading:description-ready', (event, err) => {
        logger.log('ipcMain: got loading:description-ready');
        if (err) {
          logger.error(err)
        }

        resolve()
      })

      // logger.log('win.electronService: 1 2 3: ', window);
      // logger.log('win.electronService: 4 5 6: ', window && window.electronService);
      // logger.log('win: ', win);
      // logger.log('win.webContents: before: ', win.webContents);
      logger.log('win.webContents: before: 1');
      win.webContents.send(
        'loading:description',
        description,
      )
      logger.log('win.webContents: before: 2');
      // win.webContents.mainFrame._send(
      //   'loading:description',
      //   description,
      // )
      logger.log('win.webContents: removed test ref error');
      resolve()
    } catch (err) {
      logger.error(err)

      resolve()
    }
  })
}

const showLoadingWindow = async (opts = {}) => {

  try {
    logger.log('showLoadingWindow: ', opts);
    const {
      description = '',
      isRequiredToCloseAllWins = false,
      isNotRunProgressLoaderRequired = false,
      isIndeterminateMode = false,
      noParent = false,
    } = { ...opts }

    if (isRequiredToCloseAllWins) {
      logger.log('if: 111');
      _closeAllWindows()
    }
    logger.log('wins.loadingWindow: ', wins.loadingWindow);
    logger.log('wins.loadingWindow.isDestroyed(): ', wins?.loadingWindow?.isDestroyed());
    if (
      !wins.loadingWindow
      || typeof wins.loadingWindow !== 'object'
      || wins.loadingWindow.isDestroyed()
    ) {
      logger.log('if: 222');
      await require('./window-creators')
      .createLoadingWindow()
    } else {
      logger.log('else: 222');
    }

    logger.log('_setParentWindow here');
    _setParentWindow(isRequiredToCloseAllWins || noParent)

    if (!isNotRunProgressLoaderRequired) {
      logger.log('if: 333');
      _runProgressLoader({ isIndeterminateMode })
    } else {
      logger.log('else: 333');
    }

    logger.log('_setLoadingDescription: ', wins.loadingWindow);
    logger.info('_setLoadingDescription before: ');
    await _setLoadingDescription(
      wins.loadingWindow,
      description,
    )
    logger.info('_setLoadingDescription end: ');

    logger.log('wins.loadingWindow.isVisible(): ', wins.loadingWindow.isVisible());
    if (wins.loadingWindow.isVisible()) {
      return
    }

    centerWindow(wins.loadingWindow)

    logger.log('showWindow: last');
    return showWindow(wins.loadingWindow)

  } catch (err) {
    logger.log('error is here: ', err)
  }
}

const hideLoadingWindow = async (opts = {}) => {
  const {
    isRequiredToShowMainWin = false,
  } = { ...opts }
  logger.log('hideLoadingWindow: ', opts);

  if (isRequiredToShowMainWin) {
    await showWindow(wins.mainWindow)
  }

  // need to empty description
  await _setLoadingDescription(
    wins.loadingWindow,
    '',
  )
  _stopProgressLoader()

  return hideWindow(wins.loadingWindow)
}

module.exports = {
  showLoadingWindow,
  hideLoadingWindow,
}
