import { Machine } from 'xstate'

import { ServerMachineCtx } from './context'
import * as services from './services'
import * as actions from './actions'

const asyncState = (src: string, onDoneTarget?: string) => ({
  initial: 'exec',
  states: {
    exec: {
      invoke: {
        src,
        onDone: 'success',
        onError: 'failure',
      },
    },
    success: {
      type: 'final',
    },
    failure: {
      actions: ['logError'],
      type: 'final',
    },
  },
  onDone: {
    target: onDoneTarget || 'exit',
  },
})

const devMachine = Machine<ServerMachineCtx>({
  id: 'devServer',
  type: 'parallel',
  states: {
    watch: {
      onEntry: 'ensureFiles',
      invoke: {
        src: 'watchFiles',
      },
    },
    server: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            START_MACHINE: {
              actions: ['assignFirstInstall', 'checkIsDoczRepo'],
              target: 'ensuringDirs',
            },
          },
        },
        ensuringDirs: asyncState('ensureDirs', 'creatingResources'),
        creatingResources: asyncState('createResources', 'installingDeps'),
        installingDeps: asyncState('installDeps', 'executingCommand'),
        executingCommand: asyncState('execDevCommand'),
        exit: {
          type: 'final',
        },
      },
    },
  },
})

const buildStateMachine = Machine<ServerMachineCtx>({
  id: 'buildMachine',

  initial: 'idle',
  states: {
    idle: {
      on: {
        START_MACHINE: {
          actions: ['assignFirstInstall', 'checkIsDoczRepo', 'ensureFiles'],
          target: 'copyingFiles',
        },
      },
    },
    copyingFiles: asyncState('copyFiles', 'ensuringDirs'),
    ensuringDirs: asyncState('ensureDirs', 'creatingResources'),
    creatingResources: asyncState('createResources', 'installingDeps'),
    installingDeps: asyncState('installDeps', 'executingCommand'),
    executingCommand: asyncState('execBuildCommand'),
    exit: {
      type: 'final',
    },
  },
})

export const devServerMachine = devMachine.withConfig({
  services,
  actions,
} as any)

export const buildMachine = buildStateMachine.withConfig({
  services,
  actions,
} as any)
