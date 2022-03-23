'use strict'

const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { MacUpdater } = require('electron-updater')
const extract = require('extract-zip')

const { rootPath: appDir } = require('electron-root-path')
const logger = require('electron-log')
class BfxMacUpdater extends MacUpdater {
  constructor (...args) {
    super(...args)

    this.quitAndInstallCalled = false
    this.quitHandlerAdded = false

    this.EVENT_INSTALLING_UPDATE = 'EVENT_INSTALLING_UPDATE'

    this.installingUpdateEventHandlers = []
    this._logger === logger
  }

  setDownloadedFilePath (downloadedFilePath) {
    this.downloadedFilePath = downloadedFilePath
  }

  getDownloadedFilePath () {
    return this.downloadedFilePath
  }

  addInstallingUpdateEventHandler (handler) {
    this.installingUpdateEventHandlers.push(handler)
  }

  async install (isSilent, isForceRunAfter) {
    this._logger.info('install: inside: ', isSilent, isForceRunAfter);
    try {
      if (this.quitAndInstallCalled) {
        this._logger.warn('Install call ignored: quitAndInstallCalled is set to true')

        return false
      }

      this.quitAndInstallCalled = true

      this._logger.info(`Install: isSilent: ${isSilent}, isForceRunAfter: ${isForceRunAfter}`)

      if (!isSilent) {
        this._logger.log('if !isSilent: with dispatchInstallingUpdate');
        await this.dispatchInstallingUpdate()
      }
      this._logger.log('after dispatchInstallingUpdate: ')

      const downloadedFilePath = this.getDownloadedFilePath()
      this._logger.info('downloadedFilePath: in install: ', downloadedFilePath);

      const root = path.join(appDir, '../../..')
      const dist = path.join(root, '..')
      const productName = 'The Honey Framework'
      const exec = path.join(root, 'Contents/MacOS/' + productName)
      this._logger.log('exec: ', exec);
      this._logger.log('root: ', root);
      this._logger.log('dist: ', dist);

      await fs.promises.rmdir(root, { recursive: true })

      this._logger.log('after rmdir: ');

      await extract(
        downloadedFilePath,
        {
          dir: dist,
          defaultDirMode: '0o777',
          defaultFileMode: '0o777'
        }
      )

      this._logger.log('after extract: ');

      if (!isForceRunAfter) {
        console.log('if: end');
        return true
      }
      this._logger.log('before spawn')
      spawn(exec, [], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env
        }
      }).unref()
      this._logger.log('after spawn')
      return true
    } catch (err) {
      // this.dispatchError(err)
      this._logger.log('error catch: 2: ', err);

      return false
    }
  }

  async asyncQuitAndInstall (isSilent, isForceRunAfter) {
    this._logger.info('Install on explicit quitAndInstall')

    const isInstalled = await this.install(
      isSilent,
      isSilent
        ? isForceRunAfter
        : true
    )
    this._logger.info('after isInstalled: ', isInstalled)
    // const isInstalled = await this.install(
    //  true, true
    // )

    if (isInstalled) {
      setImmediate(() => this.app.quit())

      return
    }

    this.quitAndInstallCalled = false
  }

  quitAndInstall (...args) {
    const downloadedFilePath = this.getDownloadedFilePath()
    this._logger.info('quitAndInstall downloadedFilePath: ', downloadedFilePath);

    if (!fs.existsSync(downloadedFilePath)) {
      return
    }
    if (path.extname(downloadedFilePath) !== '.zip') {
      this._logger.info('if: not zip', downloadedFilePath);
      return super.quitAndInstall(...args)
    }

    this._logger.info('now calling asyncQuitAndInstall: ', args);
    return this.asyncQuitAndInstall(...args)
  }

  async dispatchInstallingUpdate () {
    this.emit(this.EVENT_INSTALLING_UPDATE)

    this._logger.info('this.installingUpdateEventHandlers: ', this.installingUpdateEventHandlers);
    for (const handler of this.installingUpdateEventHandlers) {
      if (typeof handler !== 'function') {
        return
      }

      await handler()
    }
  }

  dispatchUpdateDownloaded (...args) {
    super.dispatchUpdateDownloaded(...args)

    this.addQuitHandler()
  }

  addQuitHandler () {
    if (
      this.quitHandlerAdded ||
      !this.autoInstallOnAppQuit
    ) {
      return
    }

    this.quitHandlerAdded = true

    this.app.onQuit((exitCode) => {
      if (exitCode === 0) {
        return
      }

      this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${exitCode}`)
    })

    // Need to use this.app.app prop due this.app is ElectronAppAdapter
    this.app.app.once('will-quit', (e) => {
      if (this.quitAndInstallCalled) {
        this._logger.info('Update installer has already been triggered. Quitting application.')

        return
      }

      e.preventDefault()
      this._logger.info('Auto install update on quit')

      this.install(true, true).then((isInstalled) => {
        if (isInstalled) {
          setImmediate(() => this.app.quit())

          return
        }

        setImmediate(() => this.app.app.exit(1))
      })
    })
  }
}

module.exports = BfxMacUpdater
