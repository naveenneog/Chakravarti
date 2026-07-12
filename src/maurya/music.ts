import { useEffect, useRef, useState } from 'react'

export type MusicMode = 'world' | 'council' | 'battle' | 'aftermath'

const MUSIC_MUTED_KEY = 'chakravarti.music-muted'

class CampaignMusicDirector {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private drones: OscillatorNode[] = []
  private timer: number | null = null
  private mode: MusicMode = 'world'
  private step = 0

  async start() {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.13
      this.master.connect(this.context.destination)
      this.startDrone(98, 0.045)
      this.startDrone(147, 0.028)
      this.restartPattern()
    }
    await this.context.resume()
  }

  setMode(mode: MusicMode) {
    if (this.mode === mode) {
      return
    }
    this.mode = mode
    this.step = 0
    this.restartPattern()
  }

  setMuted(muted: boolean) {
    if (!this.context || !this.master) {
      return
    }
    this.master.gain.setTargetAtTime(
      muted ? 0 : 0.13,
      this.context.currentTime,
      0.08,
    )
  }

  async suspend() {
    await this.context?.suspend()
  }

  async resume() {
    await this.context?.resume()
  }

  dispose() {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
    }
    for (const drone of this.drones) {
      drone.stop()
    }
    this.context?.close()
    this.context = null
    this.master = null
    this.drones = []
  }

  private startDrone(frequency: number, gainValue: number) {
    if (!this.context || !this.master) {
      return
    }
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = gainValue
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start()
    this.drones.push(oscillator)
  }

  private restartPattern() {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    if (!this.context) {
      return
    }
    const interval =
      this.mode === 'battle'
        ? 420
        : this.mode === 'council'
          ? 1050
          : this.mode === 'aftermath'
            ? 1350
            : 820
    this.playStep()
    this.timer = window.setInterval(() => this.playStep(), interval)
  }

  private playStep() {
    if (!this.context || !this.master || this.context.state !== 'running') {
      return
    }
    const scales: Record<MusicMode, readonly number[]> = {
      world: [0, 3, 5, 7, 10, 7],
      council: [0, 5, 3, 7, 5, 10],
      battle: [0, 3, 0, 7, 5, 3],
      aftermath: [0, 3, 7, 5, 3, 0],
    }
    const scale = scales[this.mode]
    const semitone = scale[this.step % scale.length]
    const base = this.mode === 'battle' ? 196 : 220
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = this.mode === 'battle' ? 'sawtooth' : 'triangle'
    oscillator.frequency.value = base * 2 ** (semitone / 12)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(
      this.mode === 'battle' ? 0.045 : 0.032,
      now + 0.025,
    )
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + 0.6)

    if (this.mode === 'battle' && this.step % 2 === 0) {
      const drum = this.context.createOscillator()
      const drumGain = this.context.createGain()
      drum.type = 'sine'
      drum.frequency.setValueAtTime(82, now)
      drum.frequency.exponentialRampToValueAtTime(48, now + 0.18)
      drumGain.gain.setValueAtTime(0.08, now)
      drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24)
      drum.connect(drumGain)
      drumGain.connect(this.master)
      drum.start(now)
      drum.stop(now + 0.25)
    }
    this.step += 1
  }
}

export const useAdaptiveMusic = (mode: MusicMode) => {
  const directorRef = useRef<CampaignMusicDirector | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    directorRef.current?.setMode(mode)
  }, [mode])

  useEffect(() => {
    const handleVisibility = () => {
      if (!directorRef.current || !enabled) {
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
  }, [enabled])

  useEffect(
    () => () => {
      directorRef.current?.dispose()
    },
    [],
  )

  const toggle = async () => {
    if (!directorRef.current) {
      directorRef.current = new CampaignMusicDirector()
      directorRef.current.setMode(mode)
    }
    const nextEnabled = !enabled
    if (nextEnabled) {
      await directorRef.current.start()
      directorRef.current.setMuted(false)
      window.localStorage.setItem(MUSIC_MUTED_KEY, 'false')
    } else {
      directorRef.current.setMuted(true)
      window.localStorage.setItem(MUSIC_MUTED_KEY, 'true')
    }
    setEnabled(nextEnabled)
  }

  return {
    enabled,
    toggle,
    mutedByPreference:
      typeof window !== 'undefined' &&
      window.localStorage.getItem(MUSIC_MUTED_KEY) === 'true',
  }
}
