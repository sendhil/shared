function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function getSpeechMode({ fileReady = false, speechSupported = false, voiceCount = 0 } = {}) {
  if (fileReady) return 'recorded voice';
  if (speechSupported && voiceCount > 0) return 'browser voice';
  return 'captions only';
}

function makeNoiseBuffer(context, seconds = 2) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.985 + white * 0.015;
    data[i] = last * 4.2;
  }
  return buffer;
}

export function createAudio({ cues, onStatus = () => {} }) {
  let context = null;
  let masterGain = null;
  let narrationGain = null;
  let ambienceGain = null;
  let windFilter = null;
  let windSource = null;
  let rumbleGain = null;
  let fileReady = false;
  let unlocked = false;
  let ambienceStarted = false;
  let fallbackMode = false;
  let muted = false;
  let masterValue = 0.82;
  let narrationValue = 0.96;
  let ambienceValue = 0.28;
  let activeCue = -1;
  let lastBeat = '';
  let lastState = { time: 0, playing: false, rumorLevel: 0, beat: { id: 'place' } };
  let speechToken = 0;
  let voiceListener = null;
  let lastReportedMode = '';

  const speechInfo = () => {
    const speechSupported = typeof window !== 'undefined' && Boolean(window.speechSynthesis);
    const voiceCount = speechSupported ? window.speechSynthesis.getVoices().length : 0;
    return { speechSupported, voiceCount };
  };

  const reportFallbackStatus = () => {
    const info = speechInfo();
    const mode = getSpeechMode(info);
    if (mode !== lastReportedMode) {
      onStatus({ mode, ready: true, message: mode === 'browser voice' ? 'Using the browser voice fallback' : 'Captions remain available without a speech voice' });
      lastReportedMode = mode;
    }
    return { ...info, mode };
  };

  const assetBase = typeof import.meta.env !== 'undefined' && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : '/';
  const narrationElement = typeof Audio !== 'undefined' ? new Audio(`${assetBase}audio/narration.wav`) : null;
  if (narrationElement) {
    narrationElement.preload = 'auto';
    narrationElement.volume = 1;
    narrationElement.addEventListener('canplaythrough', () => {
      fileReady = true;
      fallbackMode = false;
      onStatus({ mode: 'recorded voice', ready: true, message: 'Local narration ready' });
    });
    narrationElement.addEventListener('error', () => {
      fileReady = false;
      fallbackMode = true;
      reportFallbackStatus();
    });
    narrationElement.addEventListener('ended', () => {
      if (lastState.time < 119) return;
      if (fileReady) onStatus({ mode: 'recorded voice', ready: true, message: 'Narration complete' });
      else reportFallbackStatus();
    });
  }

  function updateGains() {
    if (!masterGain || !narrationGain || !ambienceGain) return;
    const master = muted ? 0 : masterValue;
    masterGain.gain.value = master;
    narrationGain.gain.value = narrationValue;
    ambienceGain.gain.value = ambienceValue;
    if (narrationElement) narrationElement.volume = muted ? 0 : clamp(masterValue * narrationValue, 0, 1);
  }

  function createTone(frequency, duration = 0.3, volume = 0.06, type = 'sine') {
    if (!context || !ambienceGain) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(ambienceGain);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.04);
  }

  function initContext() {
    if (context || typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    masterGain = context.createGain();
    narrationGain = context.createGain();
    ambienceGain = context.createGain();
    narrationGain.connect(masterGain);
    ambienceGain.connect(masterGain);
    masterGain.connect(context.destination);
    updateGains();

    windFilter = context.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 740;
    windFilter.Q.value = 0.3;
    windSource = context.createBufferSource();
    windSource.buffer = makeNoiseBuffer(context, 2.5);
    windSource.loop = true;
    const windGain = context.createGain();
    windGain.gain.value = 0.12;
    windSource.connect(windFilter).connect(windGain).connect(ambienceGain);
    windSource.start();

    const shimmer = context.createOscillator();
    const shimmerGain = context.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 190;
    shimmerGain.gain.value = 0.008;
    shimmer.connect(shimmerGain).connect(ambienceGain);
    shimmer.start();

    const rumble = context.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 54;
    rumbleGain = context.createGain();
    rumbleGain.gain.value = 0.0001;
    rumble.connect(rumbleGain).connect(ambienceGain);
    rumble.start();
    ambienceStarted = true;
  }

  function scheduleSpeech(state) {
    if (!fallbackMode || typeof window === 'undefined' || !window.speechSynthesis || !state.playing) return;
    const status = reportFallbackStatus();
    if (status.mode !== 'browser voice') return;
    const voices = window.speechSynthesis.getVoices();
    const cueIndex = cues.findIndex((cue) => state.time >= cue.start && state.time < cue.end);
    if (cueIndex < 0 || cueIndex === activeCue) return;
    activeCue = cueIndex;
    const token = ++speechToken;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cues[cueIndex].text);
    utterance.rate = 0.93;
    utterance.pitch = 0.92;
    utterance.volume = narrationValue;
    const preferred = voices.find((voice) => /en[-_](US|GB)/i.test(voice.lang) && /samantha|daniel|karen|alex/i.test(voice.name)) ?? voices.find((voice) => /^en/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => { if (token !== speechToken) return; };
    window.speechSynthesis.speak(utterance);
  }

  return {
    async unlock() {
      initContext();
      if (context?.state === 'suspended') await context.resume();
      unlocked = true;
      onStatus({ mode: 'loading narration', ready: false, message: 'Checking local narration' });
      if (narrationElement && !fileReady) {
        try { narrationElement.load(); } catch { /* browser will take the fallback path */ }
      }
      if (!narrationElement) fallbackMode = true;
      if (narrationElement && narrationElement.readyState >= 3) {
        fileReady = true;
        fallbackMode = false;
        onStatus({ mode: 'recorded voice', ready: true, message: 'Local narration ready' });
      } else {
        fallbackMode = true;
        const info = reportFallbackStatus();
        if (info.speechSupported && !voiceListener) {
          voiceListener = () => {
            if (fileReady) return;
            reportFallbackStatus();
          };
          window.speechSynthesis.addEventListener?.('voiceschanged', voiceListener);
        }
      }
      /* The no-file path is intentionally explicit: the ambience still plays while captions remain usable. */
      if (!narrationElement && !window.speechSynthesis) {
        fallbackMode = true;
        onStatus({ mode: 'captions only', ready: true, message: 'Captions are available without audio' });
      }
    },
    play() {
      if (!unlocked) return;
      if (context?.state === 'suspended') context.resume();
      if (fileReady && narrationElement) {
        narrationElement.play().catch(() => {
          fileReady = false;
          fallbackMode = true;
          reportFallbackStatus();
        });
      } else if (fallbackMode) {
        scheduleSpeech(lastState);
      }
    },
    pause() {
      narrationElement?.pause();
      speechToken += 1;
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    },
    restart() {
      if (narrationElement) narrationElement.currentTime = 0;
      activeCue = -1;
      speechToken += 1;
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    },
    seek(time) {
      const next = clamp(time, 0, 120);
      if (narrationElement && fileReady) narrationElement.currentTime = next;
      activeCue = -1;
      speechToken += 1;
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    },
    update(state) {
      lastState = state;
      if (windFilter) windFilter.frequency.setTargetAtTime(560 + (1 - (state.timeContrast ?? 0)) * 280, context.currentTime, 0.8);
      if (rumbleGain) rumbleGain.gain.setTargetAtTime(Math.max(0.0001, (state.rumorLevel ?? 0) * 0.035), context.currentTime, 0.5);
      if (fileReady && narrationElement) {
        if (state.playing && narrationElement.paused) narrationElement.play().catch(() => {
          fileReady = false;
          fallbackMode = true;
          reportFallbackStatus();
        });
        if (!state.playing && !narrationElement.paused) narrationElement.pause();
        if (Math.abs(narrationElement.currentTime - state.time) > 0.6) narrationElement.currentTime = state.time;
      } else if (fallbackMode) {
        scheduleSpeech(state);
      }
      if (state.beat?.id !== lastBeat) {
        if (state.beat?.id === 'announcement') createTone(690, 0.65, 0.08, 'triangle');
        if (state.beat?.id === 'rumor') createTone(64, 1.1, 0.03, 'sine');
        lastBeat = state.beat?.id ?? '';
      }
    },
    setMaster(value) { masterValue = clamp(value, 0, 1); updateGains(); },
    setNarration(value) { narrationValue = clamp(value, 0, 1); updateGains(); },
    setAmbience(value) { ambienceValue = clamp(value, 0, 1); updateGains(); },
    setMuted(value) { muted = Boolean(value); updateGains(); },
    getMode() { return fileReady ? 'recorded voice' : fallbackMode ? getSpeechMode(speechInfo()) : 'loading narration'; },
    dispose() {
      narrationElement?.pause();
      narrationElement?.removeAttribute('src');
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
      if (voiceListener && typeof window !== 'undefined') window.speechSynthesis?.removeEventListener?.('voiceschanged', voiceListener);
      context?.close();
    },
  };
}
