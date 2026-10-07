/** Synthesized locally; no media downloads. Audio failure must never block a spin. */
export class RouletteSound {
  private context: AudioContext | null = null
  private timers: number[] = []
  private nodes: OscillatorNode[] = []
  private tone(frequency: number, duration: number, volume = .045) {
    const context = this.context
    if (!context || context.state !== 'running') return
    const oscillator = context.createOscillator(), gain = context.createGain(), now = context.currentTime
    oscillator.type = 'sine'; oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration)
    oscillator.connect(gain); gain.connect(context.destination)
    this.nodes.push(oscillator)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.nodes = this.nodes.filter(node => node !== oscillator) }
    oscillator.start(); oscillator.stop(now + duration)
  }
  start(reduced: boolean) {
    this.stop()
    try {
      this.context ??= new AudioContext()
      void this.context.resume().catch(() => {})
      if (!reduced) {
        let delay = 40
        for (let i = 0; i < 23; i++) {
          this.timers.push(window.setTimeout(() => this.tone(750, .035, .025), delay))
          delay += 45 + i * 8
        }
      }
    } catch { /* Unsupported or blocked audio: roulette remains usable. */ }
  }
  celebrate() {
    this.stop()
    ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
      this.timers.push(window.setTimeout(() => this.tone(frequency, .4), i * 110))
    })
  }
  stop() {
    this.timers.forEach(window.clearTimeout); this.timers = []
    this.nodes.forEach(node => { try { node.stop() } catch { /* Already stopped. */ } }); this.nodes = []
  }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null }
}
