export type AppState =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'seeking'
  | 'spectator'
  | 'ended'
  | 'failed';

export type AppEvent =
  | Readonly<{ type: 'LOAD_COMPLETE' }>
  | Readonly<{ type: 'PLAY' }>
  | Readonly<{ type: 'PAUSE' }>
  | Readonly<{ type: 'SEEK' }>
  | Readonly<{ type: 'SEEK_COMPLETE'; resume: boolean }>
  | Readonly<{ type: 'ENTER_SPECTATOR' }>
  | Readonly<{ type: 'EXIT_SPECTATOR' }>
  | Readonly<{ type: 'END' }>
  | Readonly<{ type: 'RESTART' }>
  | Readonly<{ type: 'FAIL' }>
  | Readonly<{ type: 'RETRY' }>
  | Readonly<{ type: 'FALLBACK_READY' }>
  | Readonly<{ type: 'CONTEXT_LOST' }>
  | Readonly<{ type: 'CONTEXT_RESTORED' }>;

export function transition(state: AppState, event: AppEvent): AppState {
  if (event.type === 'FAIL') return 'failed';
  if (event.type === 'CONTEXT_LOST') {
    return state === 'playing' || state === 'seeking' || state === 'spectator'
      ? 'paused'
      : state;
  }
  if (event.type === 'CONTEXT_RESTORED') return state;

  switch (state) {
    case 'loading':
      return event.type === 'LOAD_COMPLETE' ? 'ready' : 'loading';
    case 'ready':
      if (event.type === 'PLAY') return 'playing';
      if (event.type === 'SEEK') return 'seeking';
      if (event.type === 'ENTER_SPECTATOR') return 'spectator';
      return 'ready';
    case 'playing':
      if (event.type === 'PAUSE') return 'paused';
      if (event.type === 'SEEK') return 'seeking';
      if (event.type === 'ENTER_SPECTATOR') return 'spectator';
      if (event.type === 'END') return 'ended';
      if (event.type === 'RESTART') return 'playing';
      return 'playing';
    case 'paused':
      if (event.type === 'PLAY') return 'playing';
      if (event.type === 'SEEK') return 'seeking';
      if (event.type === 'ENTER_SPECTATOR') return 'spectator';
      if (event.type === 'RESTART') return 'ready';
      return 'paused';
    case 'seeking':
      if (event.type === 'SEEK_COMPLETE') {
        return event.resume ? 'playing' : 'paused';
      }
      return 'seeking';
    case 'spectator':
      return event.type === 'EXIT_SPECTATOR' ? 'paused' : 'spectator';
    case 'ended':
      if (event.type === 'RESTART') return 'ready';
      if (event.type === 'PLAY') return 'playing';
      if (event.type === 'SEEK') return 'seeking';
      if (event.type === 'ENTER_SPECTATOR') return 'spectator';
      return 'ended';
    case 'failed':
      if (event.type === 'RETRY') return 'loading';
      if (event.type === 'FALLBACK_READY') return 'ready';
      return 'failed';
  }
}
