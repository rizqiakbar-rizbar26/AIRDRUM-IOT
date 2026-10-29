// Unit test processing.js — jalankan: node --test tests/
const test = require('node:test'), assert = require('node:assert');
const P = require('../docs/js/processing.js');

function alirkan(det, nilai, dt) { // kirim deret magnitude, kembalikan semua pukulan
  const out = []; nilai.forEach((a, i) => { const h = det.push(i * dt, a); if (h) out.push(h); }); return out;
}

test('A: pukulan terdeteksi di puncak lokal di atas ambang', () => {
  const h = alirkan(P.createHitDetector(), [1, 2, 8, 15, 9, 2, 1], 10);
  assert.equal(h.length, 1); assert.equal(h[0].peak_acc, 15); assert.equal(h[0].t, 30);
});
test('A: diam / getar kecil tidak memicu pukulan (false hit)', () => {
  assert.equal(alirkan(P.createHitDetector(), Array.from({ length: 200 }, (_, i) => 0.3 + 0.2 * Math.sin(i)), 10).length, 0);
});
test('A: cooldown 150 ms menahan pukulan beruntun', () => {
  const s = [1, 15, 1, 16, 1, 1, 1];  // puncak di t=10 dan t=30 (selisih 20 ms)
  assert.equal(alirkan(P.createHitDetector(), s, 10).length, 1);
  const lambat = [1, 15, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 16, 1, 1]; // selisih 170 ms
  assert.equal(alirkan(P.createHitDetector(), lambat, 10).length, 2);
});
test('A: HIT_ACC bisa diubah', () => {
  assert.equal(alirkan(P.createHitDetector({ HIT_ACC: 20 }), [1, 5, 15, 5, 1], 10).length, 0);
});
test('A: velocity terpeta linear 1..127', () => {
  assert.equal(P.velocityFromPeak(12), 1); assert.equal(P.velocityFromPeak(40), 127); assert.equal(P.velocityFromPeak(99), 127);
  assert.ok(P.velocityFromPeak(26) > 60 && P.velocityFromPeak(26) < 70);
});
test('B: klasifikasi aturan per sumbu dominan', () => {
  const kls = (a, b, g) => P.classifyRule([20, a, b, g]);
  assert.equal(kls(10, 300, 20), 'snare'); assert.equal(kls(10, 20, 300), 'hihat'); assert.equal(kls(300, 20, 10), 'tom');
});
test('B: jendela 200 ms dan fitur rata-rata |rotasi|', () => {
  const s = [{ t: 0, alpha: 1, beta: 1, gamma: 1 }, { t: 900, alpha: -10, beta: 40, gamma: 2 }, { t: 1000, alpha: 10, beta: -60, gamma: 4 }];
  const w = P.windowBefore(s, 1000); assert.equal(w.length, 2);
  assert.deepEqual(P.rotFeatures(w, 18), [18, 10, 50, 3]);
});
test('B: k-NN (k=3) memprediksi kelas dari data latih', () => {
  const k = new P.KNN(), ayun = (c, j) => [18 + j, c === 'tom' ? 300 : 20, c === 'snare' ? 300 : 20, c === 'hihat' ? 300 : 20];
  ['snare', 'hihat', 'tom'].forEach((c) => { for (let j = 0; j < 5; j++) k.add(c, ayun(c, j)); });
  assert.equal(k.size(), 15);
  ['snare', 'hihat', 'tom'].forEach((c) => assert.equal(k.predict(ayun(c, 2.5), 3), c));
});
test('C: delta ke ketukan terdekat (negatif = cepat)', () => {
  assert.equal(P.deltaToBeat(1000, 0, 120), 0);         // beat tiap 500 ms
  assert.equal(P.deltaToBeat(1060, 0, 120), 60);
  assert.equal(P.deltaToBeat(1450, 0, 120), -50);
  assert.equal(P.beatIndex(1450, 0, 120), 3);
});
test('C: estimasi BPM dari median jarak 4 pukulan terakhir', () => {
  assert.equal(P.estimateBpm([0, 500, 1000, 1500]), 120);
  assert.equal(P.estimateBpm([0, 400, 900, 1400, 1900]), 120); // hanya 4 terakhir
  assert.equal(P.estimateBpm([0, 500]), null);
});
test('Dashboard: penilaian pukulan', () => {
  const j = (d, h, e) => P.judgeHit({ delta_ms: d, hand: h, expected: e, tolerance_ms: 80 });
  assert.equal(j(10, 'R', 'R').result, 'TEPAT'); assert.equal(j(-100, 'R', 'R').result, 'TERLALU CEPAT');
  assert.equal(j(100, 'R', 'R').result, 'TERLAMBAT'); assert.equal(j(0, 'L', 'R').result, 'TANGAN SALAH');
  assert.equal(P.expectedHand('RLRL', 5), 'L');
});
test('Dashboard: akurasi per bar', () => {
  const h = [{ delta_ms: 10 }, { delta_ms: -70 }, { delta_ms: 150 }, { delta_ms: 5, handOk: false }];
  assert.equal(P.barAccuracy(h, 80), 0.5);
});
test('Loop adaptif: +5 BPM setelah N bar >= 80%, -5 jika < 50%, batas 60-140', () => {
  let s = { bpm: 90, streak: 0 };
  for (let i = 0; i < 3; i++) { s = P.adaptBpm(s, 0.9); assert.equal(s.bpm, 90); }
  s = P.adaptBpm(s, 0.9); assert.equal(s.bpm, 95); assert.equal(s.streak, 0);
  s = P.adaptBpm({ bpm: 95, streak: 2 }, 0.6); assert.deepEqual([s.bpm, s.streak], [95, 0]);
  assert.equal(P.adaptBpm({ bpm: 95, streak: 3 }, 0.4).bpm, 90);
  assert.equal(P.adaptBpm({ bpm: 60, streak: 0 }, 0.1).bpm, 60);
  assert.equal(P.adaptBpm({ bpm: 140, streak: 3 }, 1).bpm, 140);
});
