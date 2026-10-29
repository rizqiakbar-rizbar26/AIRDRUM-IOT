// audio.js — suara drum disintesis dengan Web Audio (tanpa file audio)
(function (root) {
  function noise(ctx, dur) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  }
  function env(ctx, g, v, dur) {
    const t = ctx.currentTime;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  }
  function playDrum(ctx, drum, velocity) {
    if (!ctx) return;
    const v = Math.max(0.05, velocity / 127), t = ctx.currentTime, g = ctx.createGain();
    g.connect(ctx.destination);
    if (drum === 'hihat') {
      const n = noise(ctx, 0.1), f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7000; n.connect(f); f.connect(g);
      env(ctx, g, v * 0.6, 0.08); n.start(t);
    } else if (drum === 'tom') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.25);
      o.connect(g); env(ctx, g, v, 0.3); o.start(t); o.stop(t + 0.3);
    } else { // snare: derau + nada rendah
      const n = noise(ctx, 0.2), f = ctx.createBiquadFilter(), o = ctx.createOscillator();
      f.type = 'bandpass'; f.frequency.value = 1800; n.connect(f); f.connect(g);
      o.frequency.value = 180; o.connect(g); env(ctx, g, v * 0.8, 0.18);
      n.start(t); o.start(t); o.stop(t + 0.15);
    }
  }
  function click(ctx, accent) { // bunyi metronom
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = accent ? 1500 : 1000;
    o.connect(g); g.connect(ctx.destination); env(ctx, g, 0.15, 0.05);
    o.start(); o.stop(ctx.currentTime + 0.06);
  }
  root.AirDrumAudio = { playDrum, click };
})(typeof self !== 'undefined' ? self : this);
