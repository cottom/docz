import spawn from 'cross-spawn'
import sh from 'shelljs'
const fs = require('fs')
const path = require('path')

import { ServerMachineCtx } from '../context'
import * as paths from '../../../config/paths'

export const execBuildCommand = async ({ args }: ServerMachineCtx) => {
  const publicDir = path.join(paths.docz, 'public')

  sh.cd(paths.docz)
  spawn.sync('yarn', ['build'], { stdio: 'inherit' })
  await fs.copy(publicDir, args.dest)
}
