// Käynnistys: three.js (WebGPU-piirtäjä, WebGL2 varalla), mallin data ja sen jälkeen sovellus (main.js).
// ?webgl osoitteessa pakottaa WebGL2:n vertailua varten.
import * as THREE_NS from 'three/webgpu';
import * as TSL from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FX } from './fx.js';

const failEl = document.getElementById('fail'), loadEl = document.getElementById('loading');
const fail = (msg) => { if (loadEl) loadEl.hidden = true; if (failEl) { failEl.hidden = false; failEl.textContent = msg; } };

try {
  // the application was written for the classic material names: the node materials take the same parameters
  const THREE = Object.assign({}, THREE_NS, { OrbitControls });
  THREE.MeshLambertMaterial = THREE_NS.MeshLambertNodeMaterial;
  THREE.MeshPhongMaterial = THREE_NS.MeshPhongNodeMaterial;
  THREE.MeshBasicMaterial = THREE_NS.MeshBasicNodeMaterial;
  THREE.LineBasicMaterial = THREE_NS.LineBasicNodeMaterial;
  THREE.SpriteMaterial = THREE_NS.SpriteNodeMaterial;
  THREE.PointsMaterial = THREE_NS.PointsNodeMaterial;

  // Colours: the application gives its colours as screen values (sRGB), the renderer works in linear light.
  // Textures drawn on a canvas are colour pictures unless marked as data (FX.data)
  THREE.CanvasTexture = class extends THREE_NS.CanvasTexture { constructor(...a){ super(...a); this.colorSpace = THREE_NS.SRGBColorSpace; } };
  // vertex colours are written as screen values too: to linear once, when they are handed over. Colour objects
  // (THREE.Color) are linear already, so a colour that goes into a vertex array is made with THREE.screenColor
  const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const done = new WeakSet(), setAttr = THREE_NS.BufferGeometry.prototype.setAttribute;
  THREE_NS.BufferGeometry.prototype.setAttribute = function(name, attr){
    if (name === 'color' && attr && attr.array instanceof Float32Array && !done.has(attr)) {
      done.add(attr); const a = attr.array, n = attr.itemSize;
      for (let i = 0; i < a.length; i += n) { a[i] = toLin(a[i]); a[i + 1] = toLin(a[i + 1]); a[i + 2] = toLin(a[i + 2]); }
    }
    return setAttr.call(this, name, attr);
  };

  // every sprite shares one geometry inside three.js: the application's clean-up of a group must not destroy it
  new THREE_NS.Sprite().geometry.dispose = function(){};
  THREE.screenColor = (v) => (typeof v === 'number' ? new THREE_NS.Color().setHex(v, THREE_NS.LinearSRGBColorSpace) : new THREE_NS.Color().setStyle(v, THREE_NS.LinearSRGBColorSpace));

  const q = new URLSearchParams(location.search);
  const renderer = new THREE_NS.WebGPURenderer({ antialias: true, alpha: true, forceWebGL: q.has('webgl') });
  await renderer.init();
  const res = await fetch('../data/site.json');
  if (!res.ok) throw new Error('data');
  window.SITE_DATA = await res.json();
  window.THREE = THREE; window.TSL = TSL; window.FX = FX; window.TALO_RENDERER = renderer;
  window.TALO_BACKEND = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = './main.js'; s.onload = ok; s.onerror = no; document.body.appendChild(s); });
} catch (e) {
  console.error(e);
  fail('3D-näkymä ei käynnistynyt: ' + (e && e.message ? e.message : e));
}
