// processing.js — pemrosesan data edge & logika adaptif AirDrum (tanpa DOM, bisa diuji di Node)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AirDrumProc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DEF = { HIT_ACC: 12, COOLDOWN_MS: 150, WINDOW_MS: 200, MAX_ACC: 40 };
  const magnitude = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

  // ---- A. Deteksi pukulan: puncak lokal magnitude > HIT_ACC, dengan cooldown ----
  function createHitDetector(opts) {
    const cfg = Object.assign({}, DEF, opts);
    let p2 = null, p1 = null, lastHit = -Infinity;
    return {
      cfg,
      // push(waktu_ms, magnitude) -> {t, peak_acc} saat pukulan terdeteksi, selain itu null
      push(t, a) {
        let hit = null;
        if (p1 && p2 && p1.a >= cfg.HIT_ACC && p1.a > p2.a && p1.a >= a && p1.t - lastHit >= cfg.COOLDOWN_MS) {
          lastHit = p1.t; hit = { t: p1.t, peak_acc: p1.a };
        }
        p2 = p1; p1 = { t, a };
        return hit;
      }
    };
  }
  // peta linear peak_acc (HIT_ACC..MAX_ACC) ke velocity 1..127
  function velocityFromPeak(peak, cfg) {
    cfg = Object.assign({}, DEF, cfg);
    const r = (peak - cfg.HIT_ACC) / (cfg.MAX_ACC - cfg.HIT_ACC);
    return Math.round(1 + 126 * Math.min(1, Math.max(0, r)));
  }

  // ---- B. Klasifikasi drum dari jendela 200 ms rotationRate sebelum puncak ----
  function windowBefore(samples, t, ms) {
    ms = ms || DEF.WINDOW_MS;
    return samples.filter((s) => s.t <= t && s.t >= t - ms);
  }
  // fitur: [peak_acc, rata-rata |alpha|, |beta|, |gamma|]
  function rotFeatures(win, peak) {
    const n = win.length || 1, m = (k) => win.reduce((s, w) => s + Math.abs(w[k]), 0) / n;
    return [peak, m('alpha'), m('beta'), m('gamma')];
  }
  // aturan: beta dominan = snare, gamma = hi-hat, alpha = tom
  function classifyRule(f) {
    const a = f[1], b = f[2], g = f[3];
    if (b >= a && b >= g) return 'snare';
    return g >= a ? 'hihat' : 'tom';
  }
  // k-NN sederhana (jarak Euclid, fitur distandarkan dengan simpangan baku data latih)
  class KNN {
    constructor() { this.data = []; }
    add(label, f) { this.data.push({ label, f: f.slice() }); }
    size() { return this.data.length; }
    predict(f, k) {
      k = k || 3;
      const d = this.data, sd = f.map((_, i) => {
        const v = d.map((x) => x.f[i]), m = v.reduce((a, b) => a + b, 0) / v.length;
        return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1;
      });
      const dist = (x) => Math.sqrt(x.reduce((s, v, i) => s + ((v - f[i]) / sd[i]) ** 2, 0));
      const near = d.map((x) => ({ label: x.label, d: dist(x.f) })).sort((a, b) => a.d - b.d).slice(0, k);
      const votes = {}; near.forEach((x) => { votes[x.label] = (votes[x.label] || 0) + 1; });
      const jarak = (l) => near.find((x) => x.label === l).d;
      return Object.keys(votes).sort((a, b) => votes[b] - votes[a] || jarak(a) - jarak(b))[0];
    }
  }

  // ---- C. Timing: delta ke ketukan terdekat dan estimasi BPM ----
  const beatMs = (bpm) => 60000 / bpm;
  const beatIndex = (t, t0, bpm) => Math.round((t - t0) / beatMs(bpm));
  // delta_ms: negatif = terlalu cepat, positif = terlambat
  const deltaToBeat = (t, t0, bpm) => t - (t0 + beatIndex(t, t0, bpm) * beatMs(bpm));
  // median jarak antar 4 pukulan terakhir (butuh minimal 3 pukulan)
  function estimateBpm(times) {
    const t = times.slice(-4);
    if (t.length < 3) return null;
    const g = []; for (let i = 1; i < t.length; i++) g.push(t[i] - t[i - 1]);
    g.sort((a, b) => a - b);
    const med = g.length % 2 ? g[(g.length - 1) / 2] : (g[g.length / 2 - 1] + g[g.length / 2]) / 2;
    return Math.round(60000 / med);
  }

  // ---- Dashboard: penilaian, akurasi per bar, loop adaptif ----
  const expectedHand = (pattern, idx) => (pattern ? pattern[((idx % pattern.length) + pattern.length) % pattern.length] : null);
  // hand: 'L' / 'R'
  function judgeHit(o) {
    const tol = o.tolerance_ms || 80, d = o.delta_ms;
    if (o.expected && o.hand !== o.expected) return { result: 'TANGAN SALAH', delta_ms: d, score: 0, tip: 'Giliran tangan ' + (o.expected === 'L' ? 'kiri' : 'kanan') };
    if (d == null) return { result: 'TEPAT', delta_ms: null, score: 100, tip: 'Mode bebas' };
    if (d < -tol) return { result: 'TERLALU CEPAT', delta_ms: d, score: 0, tip: 'Tahan sedikit' };
    if (d > tol) return { result: 'TERLAMBAT', delta_ms: d, score: 0, tip: 'Ayun lebih awal' };
    return { result: 'TEPAT', delta_ms: d, score: Math.round(100 * (1 - Math.abs(d) / tol)), tip: 'Bagus!' };
  }
  // akurasi = proporsi pukulan dengan |delta| <= toleransi dan tangan benar
  function barAccuracy(hits, tol) {
    if (!hits.length) return 0;
    return hits.filter((h) => h.handOk !== false && h.delta_ms != null && Math.abs(h.delta_ms) <= tol).length / hits.length;
  }
  // akurasi >= 80% selama N bar berturut-turut: BPM +5; akurasi < 50%: BPM -5; batas 60-140
  function adaptBpm(state, acc, opts) {
    const o = Object.assign({ N: 4, min: 60, max: 140, step: 5 }, opts);
    let { bpm, streak } = state, changed = false;
    if (acc >= 0.8) streak++; else streak = 0;
    if (streak >= o.N) { bpm = Math.min(o.max, bpm + o.step); streak = 0; changed = true; }
    else if (acc < 0.5) { bpm = Math.max(o.min, bpm - o.step); streak = 0; changed = true; }
    return { bpm, streak, changed };
  }

  return { DEF, magnitude, createHitDetector, velocityFromPeak, windowBefore, rotFeatures, classifyRule, KNN,
    beatMs, beatIndex, deltaToBeat, estimateBpm, expectedHand, judgeHit, barAccuracy, adaptBpm };
});
