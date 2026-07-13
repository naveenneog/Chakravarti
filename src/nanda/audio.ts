import { useCallback, useEffect, useRef, useState } from 'react'

export type NandaSoundEffect =
  | 'step'
  | 'jump'
  | 'sword'
  | 'impact'
  | 'hurt'
  | 'objective'
  | 'heal'
  | 'gate'
  | 'defeat'

const AUDIO_MUTED_KEY = 'chakravarti.nanda-audio-muted'

class NandaAudioDirector {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private music: GainNode | null = null
  private ambience: GainNode | null = null
  private effects: GainNode | null = null
  private sources: AudioScheduledSourceNode[] = []
  private musicTimer: number | null = null
  private musicStep = 0
  private combatUntil = 0

  async start(muted: boolean) {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.music = this.context.createGain()
      this.ambience = this.context.createGain()
      this.effects = this.context.createGain()
      this.master.gain.value = muted ? 0 : 0.72
      this.music.gain.value = 0.28
      this.ambience.gain.value = 0.24
      this.effects.gain.value = 0.7
      this.music.connect(this.master)
      this.ambience.connect(this.master)
      this.effects.connect(this.master)
      this.master.connect(this.context.destination)
      this.startAmbience()
      this.startScore()
    }
    await this.context.resume()
  }

  setMuted(muted: boolean) {
    if (!this.context || !this.master) {
      return
    }
    this.master.gain.setTargetAtTime(
      muted ? 0 : 0.72,
      this.context.currentTime,
      0.06,
    )
  }

  play(effect: NandaSoundEffect) {
    if (
      !this.context ||
      !this.effects ||
      this.context.state !== 'running'
    ) {
      return
    }
    const now = this.context.currentTime
    if (effect === 'step') {
      this.noiseBurst(now, 0.075, 0.045, 260)
      this.tone(now, 92, 0.055, 0.035, 'sine', 62)
      return
    }
    if (effect === 'jump') {
      this.tone(now, 180, 0.16, 0.07, 'triangle', 330)
      return
    }
    if (effect === 'sword') {
      this.combatUntil = performance.now() + 2200
      this.noiseBurst(now, 0.15, 0.13, 1700)
      this.tone(now, 720, 0.11, 0.055, 'sawtooth', 310)
      return
    }
    if (effect === 'impact') {
      this.combatUntil = performance.now() + 2600
      this.noiseBurst(now, 0.1, 0.18, 520)
      this.tone(now, 124, 0.18, 0.14, 'square', 72)
      return
    }
    if (effect === 'hurt') {
      this.combatUntil = performance.now() + 2600
      this.tone(now, 210, 0.2, 0.11, 'sawtooth', 82)
      this.noiseBurst(now, 0.12, 0.1, 380)
      return
    }
    if (effect === 'objective') {
      this.tone(now, 440, 0.34, 0.09, 'sine', 660)
      this.tone(now + 0.11, 660, 0.4, 0.075, 'sine', 880)
      this.tone(now + 0.24, 880, 0.48, 0.065, 'sine', 1100)
      return
    }
    if (effect === 'heal') {
      this.tone(now, 220, 0.4, 0.07, 'sine', 660)
      this.tone(now + 0.12, 330, 0.46, 0.055, 'triangle', 880)
      return
    }
    if (effect === 'gate') {
      this.noiseBurst(now, 0.85, 0.13, 210)
      this.tone(now, 74, 1.2, 0.16, 'sine', 48)
      this.tone(now + 0.28, 196, 1.1, 0.1, 'triangle', 98)
      return
    }
    this.tone(now, 110, 0.46, 0.14, 'sawtooth', 48)
    this.noiseBurst(now, 0.26, 0.12, 250)
  }

  async suspend() {
    await this.context?.suspend()
  }

  async resume() {
    await this.context?.resume()
  }

  dispose() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
    }
    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        // A one-shot source may already have ended.
      }
    }
    void this.context?.close()
    this.context = null
    this.master = null
    this.music = null
    this.ambience = null
    this.effects = null
    this.sources = []
  }

  private startAmbience() {
    if (!this.context || !this.ambience) {
      return
    }
    const droneFrequencies = [73.42, 110, 146.84]
    droneFrequencies.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator()
      const gain = this.context!.createGain()
      oscillator.type = index === 0 ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      gain.gain.value = index === 0 ? 0.11 : 0.035
      oscillator.connect(gain)
      gain.connect(this.ambience!)
      oscillator.start()
      this.sources.push(oscillator)
    })

    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * 3,
      this.context.sampleRate,
    )
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] =
        (Math.random() * 2 - 1) *
        (0.35 + 0.15 * Math.sin(index / this.context.sampleRate))
    }
    const noise = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    noise.buffer = buffer
    noise.loop = true
    filter.type = 'lowpass'
    filter.frequency.value = 620
    filter.Q.value = 0.7
    gain.gain.value = 0.06
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.ambience)
    noise.start()
    this.sources.push(noise)
  }

  private startScore() {
    if (!this.context) {
      return
    }
    const tick = () => {
      if (
        !this.context ||
        !this.music ||
        this.context.state !== 'running'
      ) {
        return
      }
      const now = this.context.currentTime
      const combat = performance.now() < this.combatUntil
      const scale = combat
        ? [0, 3, 0, 5, 7, 3, 10, 5]
        : [0, 5, 7, 3, 10, 7, 5, 3]
      const semitone = scale[this.musicStep % scale.length]
      const base = combat ? 146.84 : 196
      this.musicTone(
        now,
        base * 2 ** (semitone / 12),
        combat ? 0.26 : 0.5,
        combat ? 0.065 : 0.042,
      )
      if (this.musicStep % 2 === 0) {
        this.musicDrum(now, combat ? 0.12 : 0.075)
      }
      this.musicStep += 1
    }
    tick()
    this.musicTimer = window.setInterval(tick, 560)
  }

  private musicTone(
    start: number,
    frequency: number,
    duration: number,
    volume: number,
  ) {
    if (!this.context || !this.music) {
      return
    }
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(gain)
    gain.connect(this.music)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  private musicDrum(start: number, volume: number) {
    if (!this.context || !this.music) {
      return
    }
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(92, start)
    oscillator.frequency.exponentialRampToValueAtTime(48, start + 0.18)
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24)
    oscillator.connect(gain)
    gain.connect(this.music)
    oscillator.start(start)
    oscillator.stop(start + 0.26)
  }

  private tone(
    start: number,
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    endFrequency: number,
  ) {
    if (!this.context || !this.effects) {
      return
    }
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      start + duration,
    )
    gain.gain.setValueAtTime(0.001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(gain)
    gain.connect(this.effects)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  private noiseBurst(
    start: number,
    duration: number,
    volume: number,
    frequency: number,
  ) {
    if (!this.context || !this.effects) {
      return
    }
    const buffer = this.context.createBuffer(
      1,
      Math.ceil(this.context.sampleRate * duration),
      this.context.sampleRate,
    )
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1
    }
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    source.buffer = buffer
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = 0.8
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.effects)
    source.start(start)
  }
}

const mutedPreference = () =>
  typeof window !== 'undefined' &&
  window.localStorage.getItem(AUDIO_MUTED_KEY) === 'true'

export const useNandaAudio = () => {
  const directorRef = useRef<NandaAudioDirector | null>(null)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(mutedPreference)

  const ensureStarted = useCallback(async () => {
    if (!directorRef.current) {
      directorRef.current = new NandaAudioDirector()
    }
    await directorRef.current.start(muted)
    setStarted(true)
  }, [muted])

  const toggleMuted = useCallback(async () => {
    const next = !muted
    if (!started) {
      if (!directorRef.current) {
        directorRef.current = new NandaAudioDirector()
      }
      await directorRef.current.start(next)
      directorRef.current.setMuted(next)
      window.localStorage.setItem(AUDIO_MUTED_KEY, String(next))
      setMuted(next)
      setStarted(true)
      return
    }
    directorRef.current?.setMuted(next)
    window.localStorage.setItem(AUDIO_MUTED_KEY, String(next))
    setMuted(next)
  }, [muted, started])

  const playEffect = useCallback((effect: NandaSoundEffect) => {
    directorRef.current?.play(effect)
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (!directorRef.current || !started) {
        return
      }
      if (document.hidden) {
        void directorRef.current.suspend()
      } else {
        void directorRef.current.resume()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [started])

  useEffect(
    () => () => {
      directorRef.current?.dispose()
    },
    [],
  )

  return {
    started,
    muted,
    ensureStarted,
    toggleMuted,
    playEffect,
  }
}
