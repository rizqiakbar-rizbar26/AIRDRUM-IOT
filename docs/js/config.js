// config.js — konfigurasi bersama (edge, dashboard, simulator)
(function (root) {
  const C = {
    DEFAULT_PROJECT_ID: 'airdrum_iot',
    DEFAULT_BROKER: 'wss://broker.hivemq.com:8884/mqtt',
    // PROJECT_ID dibersihkan agar aman dipakai di topic MQTT (tanpa spasi)
    clean: (s) => String(s || '').trim().replace(/[^A-Za-z0-9_-]/g, '_'),
    base: (id) => 'airdrum/' + C.clean(id)
  };
  if (typeof module === 'object' && module.exports) module.exports = C;
  else root.AirDrumCfg = C;
})(typeof self !== 'undefined' ? self : this);
