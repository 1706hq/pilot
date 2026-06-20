"use client"

/**
 * Heavenly choral "aah" swell for the launch — generated with the Web Audio API
 * (no asset, no CSP issue). A lush major chord of detuned sawtooth "voices" is
 * passed through a bank of band-pass formant filters tuned to the "ah" vowel,
 * with gentle vibrato, so it reads as an angelic choir pad. Long, smooth fade in
 * and out.
 */

export function playLaunchPad() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()

    const run = () => {
      const now = ctx.currentTime
      const dur = 4.4

      // Master with a smooth in / smooth out envelope.
      const master = ctx.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.linearRampToValueAtTime(0.42, now + 1.4) // smooth in
      master.gain.setValueAtTime(0.42, now + 2.6) // hold
      master.gain.exponentialRampToValueAtTime(0.0001, now + dur) // smooth out
      master.connect(ctx.destination)

      // Voices sum here, then get shaped into a vowel by the formant bank.
      const voiceBus = ctx.createGain()
      voiceBus.gain.value = 1

      // "Ah" vowel formant bank (F1/F2/F3) — gives the choral, vocal timbre.
      const formants: [number, number, number][] = [
        [800, 7, 1.0],
        [1150, 8, 0.65],
        [2900, 9, 0.3],
      ]
      formants.forEach(([freq, q, gain]) => {
        const bp = ctx.createBiquadFilter()
        bp.type = "bandpass"
        bp.frequency.value = freq
        bp.Q.value = q
        const g = ctx.createGain()
        g.gain.value = gain
        voiceBus.connect(bp)
        bp.connect(g)
        g.connect(master)
      })
      // A little warm body underneath the formants.
      const body = ctx.createBiquadFilter()
      body.type = "lowpass"
      body.frequency.value = 1300
      const bodyGain = ctx.createGain()
      bodyGain.gain.value = 0.18
      voiceBus.connect(body)
      body.connect(bodyGain)
      bodyGain.connect(master)

      // Subtle vibrato shared across all voices.
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 5.1
      const lfoDepth = ctx.createGain()
      lfoDepth.gain.value = 6 // cents
      lfo.connect(lfoDepth)
      lfo.start(now)
      lfo.stop(now + dur)

      // Lush spread major chord (G major), three detuned voices each = choir.
      const chord = [196.0, 293.66, 392.0, 493.88, 587.33]
      chord.forEach((f) => {
        ;[-8, 0, 8].forEach((detune) => {
          const osc = ctx.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = f
          osc.detune.value = detune
          lfoDepth.connect(osc.detune)
          const g = ctx.createGain()
          g.gain.value = 0.04
          osc.connect(g)
          g.connect(voiceBus)
          osc.start(now)
          osc.stop(now + dur)
        })
      })

      setTimeout(() => ctx.close().catch(() => {}), (dur + 0.4) * 1000)
    }

    if (ctx.state === "suspended") {
      ctx.resume().then(run).catch(() => run())
    } else {
      run()
    }
  } catch {
    /* audio is non-critical */
  }
}
