// Käynnistys: three.js (WebGPU-piirtäjä, WebGL2 varalla), mallin data ja sen jälkeen sovellus (main.js).
// ?webgl osoitteessa pakottaa WebGL2:n vertailua varten.
import * as THREE_NS from 'three/webgpu';
import * as TSL from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const failEl = document.getElementById('fail'), loadEl = document.getElementById('loading');
const fail = (msg) => { if (loadEl) loadEl.hidden = true; if (failEl) { failEl.hidden = false; failEl.textContent = msg; } };

// The page's build stamp (index.html gives it in this file's address): the other files are asked for with the same
// stamp, so a new version of the page never runs with older copies of them from the browser's cache
const V = new URL(import.meta.url).searchParams.get('v'), VQ = V && V.indexOf('__') < 0 ? '?v=' + encodeURIComponent(V) : '';
// The language (Finnish or English) first, so that the texts the page shows while it loads are in it; a fault in the
// translation never stops the model
try { await import('./i18n.js' + VQ); } catch (e) { console.warn('i18n', e); }
const verEl = document.getElementById('ver');
if (verEl && verEl.textContent.indexOf('__') >= 0) verEl.textContent = 'Kehitysversio';

try {
  const { FX } = await import('./fx.js' + VQ);
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

  // Laatutaso: puhelimessa pienempi varjokartta. ?varjot=0 ottaa varjot pois, ?varjot=4096 pakottaa tarkkuuden
  const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  const sq = q.get('varjot'), Q = { phone, shadow: sq === '0' ? 0 : (Number(sq) || (phone ? 2048 : 4096)) };
  renderer.shadowMap.enabled = Q.shadow > 0;
  renderer.shadowMap.type = THREE_NS.PCFShadowMap;
  // Sävykäyrä: väri pysyy sellaisenaan polveen (0,72) asti ja taittuu sen yläpuolella pehmeästi kohti valkoista, sävy
  // säilyttäen. Sama kuin three.js:n neutraali käyrä ilman sen tummaa siirtymää, joka söisi mallin tummat pinnat
  // (asfaltti, katto), koska materiaaleissa ei ole kiiltoa, jota siirtymä kompensoisi
  const softTone = TSL.Fn(([colorIn, exposure]) => {
    const c = colorIn.mul(exposure), peak = TSL.max(c.r, TSL.max(c.g, c.b)), knee = TSL.float(0.72), d = TSL.float(1).sub(knee);
    const np = TSL.select(peak.lessThan(knee), peak, TSL.float(1).sub(d.mul(d).div(peak.add(d).sub(knee))));
    const sc = c.mul(np.div(TSL.max(peak, 1e-5)));
    const g = TSL.float(1).sub(TSL.float(1).div(TSL.float(0.15).mul(peak.sub(np)).add(1)));
    return TSL.mix(sc, TSL.vec3(np, np, np), g);
  });
  renderer.library.addToneMapping(softTone, THREE_NS.CustomToneMapping);
  renderer.toneMapping = THREE_NS.CustomToneMapping;
  renderer.toneMappingExposure = 1;
  // Jokainen sovelluksen luoma kappale heittää ja ottaa varjon, paitsi läpinäkyvät (lasi, vesi, hehkut) ja omalla
  // varjostimella piirretyt (taivas, tuli). Poikkeukset (maasto, kaukaiset puut) asetetaan main.js:ssä
  const shadowDefaults = (o, m) => {
    const one = m && !Array.isArray(m), own = one && m.userData && m.userData.own;
    o.castShadow = !(one && (m.transparent || own)); o.receiveShadow = !own;
  };
  THREE.Mesh = class extends THREE_NS.Mesh { constructor(g, m){ super(g, m); shadowDefaults(this, m); } };
  THREE.InstancedMesh = class extends THREE_NS.InstancedMesh { constructor(g, m, n){ super(g, m, n); shadowDefaults(this, m); } };
  THREE.SkinnedMesh = class extends THREE_NS.SkinnedMesh { constructor(g, m){ super(g, m); shadowDefaults(this, m); } };
  // the data and the application: separate files on the site, inside the page in the single-file build (tools/)
  const dataEl = document.getElementById('data'), appEl = document.getElementById('app-src');
  if (dataEl) window.SITE_DATA = JSON.parse(dataEl.textContent);
  else { const res = await fetch('data/site.json' + VQ); if (!res.ok) throw new Error('data'); window.SITE_DATA = await res.json(); }
  window.THREE = THREE; window.TSL = TSL; window.FX = FX; window.TALO_RENDERER = renderer; window.TALO_Q = Q;
  window.TALO_BACKEND = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  if (appEl) { const s = document.createElement('script'); s.textContent = appEl.textContent; document.body.appendChild(s); }
  else await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'src/main.js' + VQ; s.onload = ok; s.onerror = no; document.body.appendChild(s); });
} catch (e) {
  console.error(e);
  fail('3D-näkymä ei käynnistynyt: ' + (e && e.message ? e.message : e));
}
