import * as path from 'path'
import * as fs from 'fs-extra'
import { finds } from 'load-cfg'

import { Config } from '../../../config/argv'
import * as paths from '../../../config/paths'
import { createWatcher } from '../../../states/config'
import { ServerMachineCtx as Context } from '../context'
import glob from 'fast-glob'

const watchGatsbyThemeFiles = (args: Config) => {
  const watcher = createWatcher('src/gatsby-theme-**/**/*', args)
  const copy = (filepath: string) => {
    const src = path.resolve(paths.root, filepath)
    const dest = path.resolve(paths.docz, filepath)
    fs.copySync(src, dest)
  }
  const remove = (filepath: string) => {
    fs.removeSync(path.resolve(paths.docz, filepath))
  }

  watcher
    .on('add', copy)
    .on('addDir', copy)
    .on('change', copy)
    .on('unlink', remove)
    .on('unlinkDir', remove)

  return () => watcher.close()
}

const createFileHandler = (src: string, custom?: boolean) => {
  const srcPath = path.join(paths.root, src)
  const destPath = path.join(
    paths.docz,
    custom ? src.replace('.js', '.custom.js') : src
  )
  return {
    copyFile: () => fs.existsSync(srcPath) && fs.copySync(srcPath, destPath),
    deleteFile: () => fs.existsSync(destPath) && fs.removeSync(destPath),
  }
}

const createWatch = (args: Config) => (
  glob: any,
  src: string,
  custom?: boolean
) => {
  const watcher = createWatcher(glob, args)
  const { copyFile, deleteFile } = createFileHandler(src, custom)

  watcher
    .on('add', copyFile)
    .on('change', copyFile)
    .on('unlink', deleteFile)

  return () => watcher.close()
}

export const watchFiles = ({ args }: Context) => () => {
  const watch = createWatch(args)
  const doczrc = watch(args.config || finds('docz'), 'doczrc.js')
  const gatsbyBrowser = watch(paths.gatsbyBrowser, 'gatsby-browser.js')
  const gatsbyNode = watch(paths.gatsbyNode, 'gatsby-node.js')
  const gatsbySSR = watch(paths.gatsbySSR, 'gatsby-ssr.js')
  const gatsbyConfig = watch(paths.gatsbyConfig, 'gatsby-config.js', true)
  const themeFilesWatcher = watchGatsbyThemeFiles(args)

  return () => {
    doczrc()
    gatsbyConfig()
    gatsbyBrowser()
    gatsbyNode()
    gatsbySSR()
    themeFilesWatcher()
  }
}

export const copyFiles = () => () => {
  return new Promise((resolve, reject) => {
    try {
      const copy = (file: string, custom = false) => {
        const { copyFile, deleteFile } = createFileHandler(file, custom)
        deleteFile()
        copyFile()
      }
      ;[
        'doczrc.js',
        'gatsby-browser.js',
        'gatsby-node.js',
        'gatsby-ssr.js',
        ...(glob.sync(path.resolve(paths.root, 'src/gatsby-theme-**/**/*'), {
          dot: true,
        }) as string[]),
      ].forEach(file => copy(file))
      copy('gatsby-config.js', true)
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}
