export function bindControls({ clock, audio, camera, ui }) {
  let captionsEnabled = true;
  let orbitEnabled = false;

  const updateButton = (state) => {
    const playing = Boolean(state?.playing);
    ui.playButton.textContent = playing ? 'Pause' : 'Play';
    ui.playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    ui.playButton.setAttribute('aria-pressed', String(playing));
    ui.seekInput.value = String(state?.time ?? 0);
    ui.timelineBeat.textContent = state?.beat?.label ?? 'Opening';
    ui.beatLabel.textContent = state?.beat?.label ?? 'The hill wakes slowly';
    const time = Math.max(0, state?.time ?? 0);
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    ui.timeReadout.textContent = `${minutes}:${seconds} / 02:00`;
    ui.caption.textContent = state?.caption ?? '';
    ui.caption.hidden = !captionsEnabled || !state?.caption;
  };

  const onBegin = async () => {
    ui.beginButton.disabled = true;
    ui.gateStatus.textContent = 'Opening the lane…';
    try { await audio.unlock(); } catch { ui.gateStatus.textContent = 'Captions available; audio could not unlock.'; }
    ui.beginGate.classList.add('is-hidden');
    clock.play(performance.now() / 1000);
    audio.play();
  };
  const onPlay = () => {
    const state = clock.getState();
    if (state.playing) {
      clock.pause();
      audio.pause();
    } else {
      clock.play(performance.now() / 1000);
      audio.play();
    }
  };
  const onRestart = () => {
    audio.restart();
    clock.restart(performance.now() / 1000);
    audio.play();
  };
  const onSeek = (event) => {
    const next = Number(event.currentTarget.value);
    clock.seek(next);
    audio.seek(next);
    if (clock.getState().playing) audio.play();
  };
  const onMute = () => {
    const next = ui.muteButton.getAttribute('aria-pressed') !== 'true';
    ui.muteButton.setAttribute('aria-pressed', String(next));
    ui.muteButton.textContent = next ? 'Unmute' : 'Mute';
    audio.setMuted(next);
  };
  const onCaptions = () => {
    captionsEnabled = !captionsEnabled;
    ui.captionsToggle.setAttribute('aria-pressed', String(captionsEnabled));
    ui.caption.hidden = !captionsEnabled;
  };
  const onOrbit = () => {
    orbitEnabled = !orbitEnabled;
    ui.orbitToggle.setAttribute('aria-pressed', String(orbitEnabled));
    ui.orbitToggle.textContent = orbitEnabled ? 'Story camera' : 'Orbit view';
    camera.setOrbit(orbitEnabled);
  };

  ui.beginButton.addEventListener('click', onBegin);
  ui.playButton.addEventListener('click', onPlay);
  ui.restartButton.addEventListener('click', onRestart);
  ui.seekInput.addEventListener('input', onSeek);
  ui.muteButton.addEventListener('click', onMute);
  ui.captionsToggle.addEventListener('click', onCaptions);
  ui.orbitToggle.addEventListener('click', onOrbit);
  ui.masterInput.addEventListener('input', (event) => audio.setMaster(event.currentTarget.value));
  ui.narrationInput.addEventListener('input', (event) => audio.setNarration(event.currentTarget.value));
  ui.ambienceInput.addEventListener('input', (event) => audio.setAmbience(event.currentTarget.value));

  return {
    update: updateButton,
    setAudioMessage(message) {
      ui.audioStatus.textContent = message;
      ui.gateStatus.textContent = message;
    },
    destroy() {
      ui.beginButton.removeEventListener('click', onBegin);
      ui.playButton.removeEventListener('click', onPlay);
      ui.restartButton.removeEventListener('click', onRestart);
      ui.seekInput.removeEventListener('input', onSeek);
      ui.muteButton.removeEventListener('click', onMute);
      ui.captionsToggle.removeEventListener('click', onCaptions);
      ui.orbitToggle.removeEventListener('click', onOrbit);
    },
  };
}
