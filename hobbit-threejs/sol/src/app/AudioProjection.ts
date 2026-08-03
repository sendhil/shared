import type { AudioBusSnapshot } from '../audio/AudioBus';

export type GainParameterPort = Readonly<{
  setTargetAtTime(value: number, startTime: number, timeConstant: number): void;
}>;

export type AudioGainPorts = Readonly<{
  master: GainParameterPort;
  narration: GainParameterPort;
  ambience: GainParameterPort;
}>;

export function projectAudioSnapshot(
  snapshot: AudioBusSnapshot,
  gains: AudioGainPorts,
  time: number,
): void {
  const at = Number.isFinite(time) ? time : 0;
  gains.master.setTargetAtTime(snapshot.effectiveMaster, at, 0.025);
  gains.narration.setTargetAtTime(snapshot.narration, at, 0.025);
  gains.ambience.setTargetAtTime(snapshot.ambience, at, 0.025);
}
