// Mallin omat tehosteet uudelle piirtäjälle (three.js TSL). Vanhassa moottorissa nämä olivat GLSL-muutoksia
// materiaalien varjostimiin (onBeforeCompile) ja omia ShaderMaterial-varjostimia; täällä ne ovat solmuja, jotka
// toimivat sekä WebGPU:lla että WebGL2:lla. main.js kutsuu näitä nimellä FX.
import * as THREE from 'three/webgpu';
import {
  Fn, If, Loop, Break, uniform, uniformArray, texture, attribute, uv, vertexColor, float, int, vec2, vec3, vec4,
  positionLocal, positionWorld, normalLocal, normalViewGeometry, normalWorldGeometry, faceDirection, cameraPosition,
  modelWorldMatrix, materialColor, materialEmissive, materialOpacity, diffuseColor, output, select, mix, smoothstep, step, clamp, max, min, abs, dot,
  length, normalize, fract, floor, sin, exp, pow, reflect, rand, sRGBTransferEOTF, sRGBTransferOETF
} from 'three/tsl';

// The application's colours and its painted effects were written for the screen (sRGB); the renderer works in linear
// light. toS takes a linear colour to the screen's values for the old formulas, toL brings the result back
const toL = (c) => sRGBTransferEOTF(c), toS = (c) => sRGBTransferOETF(c);
const inBox = (q) => q.x.greaterThanEqual(0).and(q.y.greaterThanEqual(0)).and(q.x.lessThanEqual(1)).and(q.y.lessThanEqual(1));
const data = (tex) => { if (tex && tex.isTexture) tex.colorSpace = THREE.NoColorSpace; return tex; };

// a material with a shader of its own (sky, glass, fire, lamp glows): the application keeps its meshes as they are
const own = (m) => { m.userData.own = true; return m; };
// {name: value} into shared uniform nodes; each keeps .value as the application sets it. Textures given here are data
// (masks), not colours
function uniforms(o){
  const out = {};
  Object.keys(o).forEach((k) => { const v = o[k]; out[k] = v && v.isTexture ? texture(data(v)) : uniform(v); });
  return out;
}
function addMask(mat, keep){ mat.maskNode = mat.maskNode ? mat.maskNode.and(keep) : keep; }
// the material's own colour (colour, map) times the vertex colours where it has them. The terrain's materials turn
// their vertex colours on and off with the orthophoto, so the switch is kept here and read when the material is built
function ownColor(mat){
  if (!mat.userData.fxVC) {
    mat.userData.fxVC = true; mat.userData.vc = !!mat.vertexColors;
    Object.defineProperty(mat, 'vertexColors', { get(){ return false; }, set(v){ this.userData.vc = !!v; }, configurable:true });
  }
  return Fn((builder) => (builder.material.userData.vc && builder.geometry.hasAttribute('color') ? materialColor.rgb.mul(vertexColor().rgb) : materialColor.rgb))();
}

// ---------- the sky dome ----------
function skyMaterial(sunDir){
  const U = { sunDir:uniform(sunDir), dusk:uniform(0), noon:uniform(0), night:uniform(0) };
  const m = own(new THREE.MeshBasicNodeMaterial({ side:THREE.BackSide, depthWrite:false, fog:false }));
  m.colorNode = Fn(() => {
    const d = normalize(positionLocal), h = d.y, dusk = U.dusk, noon = U.noon;
    const zen = mix(mix(vec3(0.27, 0.40, 0.62), vec3(0.24, 0.44, 0.76), noon), vec3(0.035, 0.05, 0.12), dusk);
    const mid = mix(mix(vec3(0.58, 0.68, 0.81), vec3(0.52, 0.68, 0.88), noon), vec3(0.11, 0.14, 0.26), dusk);
    const hor = mix(mix(vec3(0.97, 0.82, 0.64), vec3(0.85, 0.90, 0.95), noon), vec3(0.62, 0.36, 0.25), dusk);
    const gnd = mix(vec3(0.46, 0.44, 0.40), vec3(0.08, 0.08, 0.09), dusk);
    const up = mix(hor, mid, smoothstep(0.0, 0.2, h)), dn = mix(hor, gnd, smoothstep(0.0, 0.12, h.negate()));
    const col = select(h.greaterThanEqual(0), up, dn).toVar();
    col.assign(select(h.greaterThan(0.2), mix(mid, zen, smoothstep(0.2, 0.8, h)), col));
    const sd = max(dot(d, normalize(U.sunDir)), 0.0);
    const glow = mix(vec3(1.0, 0.70, 0.40), vec3(1.0, 0.93, 0.80), noon).mul(pow(sd, 5.0).mul(0.30).add(pow(sd, 60.0).mul(0.45)))
      .mul(float(1).sub(smoothstep(0.05, 0.6, h))).mul(float(1).sub(dusk.mul(0.6))).mul(float(1).sub(noon.mul(0.5)));
    col.addAssign(glow);
    col.assign(mix(col, vec3(1.0, 0.96, 0.86), smoothstep(0.9988, 0.9996, sd).mul(float(1).sub(dusk))));
    // the dead of night: the last glow of the dusk goes out
    return toL(col.mul(mix(float(1.0), float(0.07), U.night)));
  })();
  m.uniforms = U;
  return m;
}

// ---------- the ground: holes, cut-outs, the grey look, road paint and fine grain ----------
// inside the plot (x, z)? An exact test against its corners: Vain tontti cuts the ground along the boundary, and what
// stands on the plot itself is never taken away from in front of the camera
function plotIn(P, p){
  let n = float(0);
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    if (Math.abs(b[1] - a[1]) < 1e-6) continue;
    const across = float(a[1]).sub(p.y).mul(float(b[1]).sub(p.y)).lessThan(0.0);
    const left = p.x.lessThan(float((b[0] - a[0]) / (b[1] - a[1])).mul(p.y.sub(a[1])).add(a[0]));
    n = n.add(select(across.and(left), 1.0, 0.0));
  }
  return n.mod(2.0).greaterThan(0.5);
}
const pitIn = (U, xz) => {
  const pq = xz.sub(U.uPit.xy), pl = abs(vec2(dot(pq, U.uPit.zw), dot(pq, vec2(U.uPit.w.negate(), U.uPit.z))));
  return U.uPitOn.greaterThan(0.5).and(pl.x.lessThan(U.uPitS.x)).and(pl.y.lessThan(U.uPitS.y));
};
const tubIn = (U, xz) => {
  const tdq = xz.sub(U.uTub.xy);
  const tlq = abs(vec2(dot(tdq, U.uTub.zw), dot(tdq, vec2(U.uTub.w.negate(), U.uTub.z)))).sub(vec2(U.uTubS.x.sub(U.uTubS.y)));
  const sd = length(max(tlq, vec2(0))).add(min(max(tlq.x, tlq.y), 0.0)).sub(U.uTubS.y);
  return U.uTubOn.greaterThan(0.5).and(sd.lessThan(-0.015));
};
const rdH = Fn(([p]) => { const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar(); p3.addAssign(dot(p3, p3.yzx.add(33.33))); return fract(p3.x.add(p3.y).mul(p3.z)); });
const rdN = Fn(([p]) => {
  const i = floor(p), f0 = fract(p), f = f0.mul(f0).mul(float(3).sub(f0.mul(2)));
  return mix(mix(rdH(i), rdH(i.add(vec2(1, 0))), f.x), mix(rdH(i.add(vec2(0, 1))), rdH(i.add(vec2(1, 1))), f.x), f.y);
});
// darker asphalt (as the yard's), a crisp edge with a little wear, and shoulders of light gravel along the road
function roadTint(C, c, xz){
  const ruv = xz.sub(C.uRoadBox.xy).div(C.uRoadBox.zw), nuv = xz.sub(C.uRoadBoxN.xy).div(C.uRoadBoxN.zw);
  const ra = C.uRoad.sample(clamp(ruv, 0, 1)), rb = C.uRoadN.sample(clamp(nuv, 0, 1));
  const en = step(vec2(0.002), nuv).mul(step(nuv, vec2(0.998))), rm = mix(ra, rb, en.x.mul(en.y));
  const gr = rdN(xz.mul(9.0)).sub(0.5), gg = rdN(xz.mul(17.0)).sub(0.5).mul(0.8).add(rdN(xz.mul(41.0)).sub(0.5).mul(0.7));
  const pa = rdN(xz.mul(0.35)).sub(0.5), pb = rdN(xz.mul(1.6)).sub(0.5), k = C.uRoadK;
  const asp = vec3(0.205, 0.212, 0.224).mul(float(1).add(gr.mul(0.07)).add(pa.mul(0.12)).add(pb.mul(0.06)));
  const lgt = vec3(0.33, 0.335, 0.335).mul(float(1).add(gr.mul(0.07)).add(pa.mul(0.12)));
  const grv = vec3(0.53, 0.5, 0.44).mul(float(1).add(gg.mul(0.16)).add(pb.mul(0.08)));
  const c1 = mix(c, grv, smoothstep(0.16, 0.36, rm.b).mul(k)), c2 = mix(c1, lgt, smoothstep(0.4, 0.6, rm.g).mul(k));
  const red = smoothstep(0.3, 0.48, rm.r).mul(float(1).sub(smoothstep(0.52, 0.7, rm.r)));
  const c3 = mix(c2, asp, smoothstep(0.42, 0.58, rm.r).mul(k)).mul(float(1).sub(red.mul(0.16).mul(k)));
  return select(inBox(ruv).and(C.uRoadOn.greaterThan(0.5)), c3, c);
}
// the fine grain of the yard: the asphalt's aggregate, the gravel's stones and the lawn's blades
function yardGrain(det, c, xz){
  const mx = max(max(c.r, c.g), c.b), mn = min(min(c.r, c.g), c.b), grey = float(1).sub(smoothstep(0.12, 0.3, mx.sub(mn).div(max(mx, 0.001))));
  const lum = dot(c, vec3(0.3, 0.59, 0.11));
  const da = det.sample(xz.mul(2.0)).r.sub(0.5), dg = det.sample(xz.add(0.37)).g.sub(0.5);
  const fa = grey.mul(float(1).sub(smoothstep(0.32, 0.5, lum))), fg = grey.mul(smoothstep(0.42, 0.6, lum));
  const gn = smoothstep(0.03, 0.12, c.g.sub(max(c.r, c.b)));
  const b1 = det.sample(xz.mul(4.3)).r.sub(0.5), b2 = det.sample(xz.mul(1.6).add(0.21)).g.sub(0.5), b3 = det.sample(xz.mul(0.27).add(0.6)).r.sub(0.5);
  const lawn = c.mul(float(1).add(b1.mul(0.42)).add(b2.mul(0.26))).mul(float(1).add(b3.mul(0.22))).add(vec3(0.03, 0.025, 0.0).mul(smoothstep(0.1, 0.4, b3)));
  return mix(c.mul(float(1).add(fa.mul(0.55).mul(da)).add(fg.mul(0.7).mul(dg))), lawn, gn);
}
function grayAware(mat, G){
  const ghs = clamp(dot(normalize(normalLocal), normalize(vec3(-0.5, 0.62, -0.6))), 0.0, 1.0);
  const ghv = clamp(positionLocal.y.sub(G.uGrayZ.x).div(G.uGrayZ.y.sub(G.uGrayZ.x)), 0.0, 1.0);
  const g = float(0.13).add(ghs.mul(ghs).mul(0.58)).add(ghv.mul(0.27));
  mat.outputNode = select(G.uGray.greaterThan(0.5), vec4(toL(vec3(g)), output.a), output);
  return mat;
}
function pitAware(mat, T){ addMask(mat, pitIn(T, positionLocal.xz).not()); return mat; }
function cutAware(mat, C, T, P){
  const xz = positionLocal.xz, pmv = xz.sub(C.uPlanBox.xy).div(C.uPlanBox.zw);
  const cutOut = C.uCut.greaterThan(0.5).and(plotIn(P, xz).not());
  const planOut = C.uPlanOn.greaterThan(0.5).and(inBox(pmv)).and(C.uPlanMask.sample(clamp(pmv, 0, 1)).r.greaterThan(0.5));
  addMask(mat, pitIn(T, xz).or(tubIn(T, xz)).or(cutOut).or(planOut).not());
  mat.colorNode = vec4(toL(roadTint(C, toS(ownColor(mat)), xz)), 1.0);
  return mat;
}
function roadAware(mat, C, T, detTex, ykTex, P){
  const xz = positionLocal.xz, det = texture(data(detTex)), yk = texture(data(ykTex), uv()).r;
  addMask(mat, pitIn(T, xz).or(tubIn(T, xz)).or(C.uCut.greaterThan(0.5).and(plotIn(P, xz).not())).not());
  const c0 = toS(ownColor(mat));
  mat.colorNode = vec4(toL(roadTint(C, mix(c0, yardGrain(det, c0, xz), yk), xz)), 1.0);
  return mat;
}
// Vain tontti for everything else that may reach over the boundary (roads, pipes, lines, the fill's body): drawn only
// inside the plot while the cut is on. P is the plot a little grown, so what runs along the boundary stays whole
function plotOnly(mat, C, P){
  if (!mat || !mat.isNodeMaterial || mat.userData.pc) return mat;
  mat.userData.pc = true;
  addMask(mat, C.uCut.lessThan(0.5).or(plotIn(P, positionWorld.xz)));
  mat.needsUpdate = true;
  return mat;
}
// a rectangular hole (in map coordinates) in the far terrain, where the nearer terrain takes over
function holeCut(mat, hole, tE, tN){
  const H = uniform(hole), E = uniform(tE), N = uniform(tN), p = positionLocal;
  const hE = E.x.add(E.y.mul(p.x)).add(E.z.mul(p.z)), hN = N.x.add(N.y.mul(p.x)).add(N.z.mul(p.z));
  addMask(mat, hE.greaterThan(H.x).and(hE.lessThan(H.z)).and(hN.greaterThan(H.y)).and(hN.lessThan(H.w)).not());
  return mat;
}

// ---------- leaves: both faces of a leaf card take the light of the crown's outward normal ----------
function leafLit(mat){ mat.normalNode = normalViewGeometry; return mat; }

// ---------- surfaces mapped in the world: boards, deck planks, the hedge ----------
// the material's map is sampled with coordinates of our own. The renderer must not see it as the material's map (it would
// multiply it in again with the mesh's own coordinates), so material.map reads empty; setting it swaps our texture, and
// FX.mapOf gives the one in use
function ownMap(mat){
  const tn = texture(mat.map); mat.userData.mapNode = tn; mat.map = null;
  Object.defineProperty(mat, 'map', { get(){ return null; }, set(v){ if (v) tn.value = v; }, configurable:true });
  return tn;
}
const mapOf = (mat) => (mat.userData.mapNode ? mat.userData.mapNode.value : mat.map);
// boards run up a wall whatever way it faces; flat faces (tops) show plain wood
function boardMap(mat){
  const tn = ownMap(mat), bn = normalWorldGeometry.mul(faceDirection), bt0 = vec2(bn.z.negate(), bn.x), bl = length(bt0);
  const bt = select(bl.greaterThan(1e-4), bt0.div(max(bl, 1e-4)), vec2(1, 0));
  const buv = select(abs(bn.y).greaterThan(0.8), vec2(0.03, 0.5), vec2(dot(positionWorld.xz, bt), positionWorld.y).mul(0.25));
  mat.colorNode = tn.sample(buv).mul(materialColor);
  return mat;
}
// deck boards: on top the grain along the boards (ax), on a side along the face
function deckMap(mat){
  const tn = ownMap(mat), ax = uniform(new THREE.Vector2(1, 0)), n = normalWorldGeometry, w = positionWorld;
  const top = vec2(dot(w.xz, ax), dot(w.xz, vec2(ax.y.negate(), ax.x)).add(w.y.mul(0.3))).mul(0.25);
  const side = vec2(dot(w.xz, normalize(vec2(n.z.negate(), n.x).add(vec2(1e-5, 0)))), w.y).mul(0.25);
  mat.colorNode = tn.sample(select(abs(n.y).greaterThan(0.5), top, side)).mul(materialColor);
  mat.userData.ax = ax;
  return mat;
}
// the hedge has no coordinates of its own: its texture from three sides, at two scales
function hedgeMap(mat){
  const tn = ownMap(mat), hw0 = pow(abs(normalize(normalWorldGeometry)), vec3(4.0)), hw = hw0.div(hw0.x.add(hw0.y).add(hw0.z));
  const tri = (p) => tn.sample(p.zy).mul(hw.x).add(tn.sample(p.xz).mul(hw.y)).add(tn.sample(p.xy).mul(hw.z));
  mat.colorNode = mix(tri(positionWorld.mul(1.1)), tri(positionWorld.mul(0.37).add(vec3(0.31, 0.17, 0.53))), 0.45).mul(materialColor);
  return mat;
}

// ---------- glass: what it reflects (the sky of the hour, the sun's glint), more towards the edge ----------
function glassMaterial(G, sun, o){
  o = o || {};
  const tint = o.tint != null;
  const m = own(new THREE.MeshBasicNodeMaterial({ color:tint ? o.tint : 0xdcebe8, transparent:true, opacity:tint ? (o.opacity || 0.4) : 1, depthWrite:false, side:THREE.DoubleSide }));
  const sunDir = uniform(sun.position), sunCol = uniform(sun.color), sunI = uniform(1);
  m.userData.sunI = sunI;
  // a glow behind the glass (the windows of the other house models in the evening), set by the application
  m.emissive = new THREE.Color(0x000000);
  const gE = toS(uniform(m.emissive));
  const N = normalize(normalWorldGeometry.mul(faceDirection)), V = normalize(cameraPosition.sub(positionWorld));
  const gC = abs(dot(N, V)), gR = min(float(0.05).add(pow(float(1).sub(gC), 5.0).mul(0.95)), 0.42);
  const gW = reflect(V.negate(), N), sky = vec3(G.uGlassSky);   // the light's colour as written
  const gSky = mix(sky.mul(0.32).add(vec3(0.05, 0.07, 0.06)), sky, smoothstep(-0.1, 0.45, gW.y)).mul(float(0.45).add(G.uGlassK.mul(0.6)));
  const gd = max(dot(gW, normalize(sunDir)), 0.0);
  const gS = vec3(sunCol).mul(pow(gd, 24000.0).mul(1.1).add(pow(gd, 1500.0).mul(0.04))).mul(G.uGlassSun).mul(sunI);
  if (tint) {
    m.colorNode = vec4(toL(mix(toS(materialColor.rgb).mul(0.5), gSky, clamp(gR, 0.0, 0.85))), 1.0);
    m.opacityNode = clamp(materialOpacity.add(gR.mul(0.85)), 0.0, 0.95);
  } else {
    m.colorNode = vec4(toL(gSky.add(gS).add(gE)), 1.0);
    m.opacityNode = clamp(gR.add(dot(gS, vec3(0.3))).add(dot(gE, vec3(0.6))).mul(materialOpacity), 0.0, 0.95);
  }
  return m;
}

// ---------- interior lights: spots, pendants, strips and the fire add a warm glow to the surfaces near them ----------
function interiorUniforms(I){
  ['uLP', 'uLC', 'uLR'].forEach((k) => { const arr = I[k].value, n = uniformArray(arr); n.value = arr; I[k] = n; });
  ['uPT0', 'uPT1', 'uLN', 'uLK', 'uDay', 'uBounce', 'uSh'].forEach((k) => { I[k] = uniform(I[k].value); });
  return I;
}
function interiorLit(mat, I, count){
  const glow = Fn(() => {
    const il = vec3(0).toVar(), w = positionWorld;
    const pp = vec2(dot(I.uPT0.xy, w.xz).add(I.uPT0.z), dot(I.uPT1.xy, w.xz).add(I.uPT1.z));
    Loop({ start:int(0), end:int(count), type:'int', condition:'<' }, ({ i }) => {
      If(float(i).greaterThanEqual(I.uLN), () => { Break(); });
      const lr = I.uLR.element(i), lp = I.uLP.element(i);
      const inRoom = pp.x.greaterThanEqual(lr.x).and(pp.x.lessThanEqual(lr.z)).and(pp.y.greaterThanEqual(lr.y)).and(pp.y.lessThanEqual(lr.w));
      const d = lp.xyz.sub(w).toVar(), cone = float(1).toVar(), rad = lp.w.toVar();
      If(lp.w.lessThan(0), () => {
        const c = floor(lp.w.negate().div(10.0)), lo = c.mul(0.01), ct = d.y.div(max(length(d), 0.001));
        rad.assign(lp.w.negate().sub(c.mul(10.0)));
        cone.assign(select(lo.lessThan(0.5), smoothstep(lo, lo.add(0.12), ct),
          smoothstep(lo, lo.add(float(1).sub(lo).mul(0.8)), ct).mul(0.85).add(smoothstep(-0.2, 0.3, ct).mul(0.15))));
      }).Else(() => { d.y.mulAssign(0.6); });
      const a = max(0.0, float(1).sub(length(d).div(rad)));
      il.addAssign(vec3(I.uLC.element(i)).mul(a.mul(a)).mul(cone).mul(select(inRoom, 1.0, 0.0)));
    });
    return vec3(1).sub(exp(il.negate())).mul(I.uLK).mul(diffuseColor.rgb);
  });
  // Daylight inside. Under the roof the rooms are in the roof's shadow, and the light that in reality bounces in through
  // the windows is missing: the surfaces get an even share of the day's light instead (uBounce). With the roof taken off
  // the sun falls in: toned down (uDay.x) and its shadows softened (uSh), so the floor plan stays easy to read
  mat.emissiveNode = materialEmissive.add(glow()).add(diffuseColor.rgb.mul(I.uBounce));
  mat.receivedShadowNode = Fn(([sh]) => sh.oneMinus().mul(I.uSh).oneMinus().mul(I.uDay.x));
  return mat;
}

// ---------- the fire, and the light of the outdoor lamps on walls and ground ----------
function fireMaterial(){
  const U = { uT:uniform(0), uK:uniform(1) };
  const m = own(new THREE.MeshBasicNodeMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, fog:false }));
  const h = Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)));
  const n = Fn(([p]) => { const i = floor(p), f0 = fract(p), f = f0.mul(f0).mul(float(3).sub(f0.mul(2))); return mix(mix(h(i), h(i.add(vec2(1, 0))), f.x), mix(h(i.add(vec2(0, 1))), h(i.add(vec2(1, 1))), f.x), f.y); });
  const q0 = uv(), t = U.uT;
  const q = n(vec2(q0.x.mul(4.0), q0.y.mul(2.6).sub(t.mul(1.9)))).mul(0.62).add(n(vec2(q0.x.mul(9.0).add(3.0), q0.y.mul(5.0).sub(t.mul(3.3)))).mul(0.38));
  const side = float(1).sub(pow(abs(q0.x.sub(0.5)).mul(2.0), 1.6));
  const f = clamp(q.mul(1.25).add(side.mul(0.75)).sub(q0.y.mul(1.35)).sub(0.32).mul(2.4), 0.0, 1.0).mul(smoothstep(0.0, 0.06, q0.y));
  m.colorNode = vec4(toL(mix(vec3(0.75, 0.16, 0.03), vec3(1.0, 0.78, 0.32), f.mul(f))).mul(f).mul(U.uK), 1.0);
  m.opacityNode = f.mul(U.uK);
  m.uniforms = U;
  return m;
}
const lampBase = () => own(new THREE.MeshBasicNodeMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, fog:false }));
// a wide cone of light down a wall: bright to about 0.9 m each side two metres down, a softer glow beyond
function washMaterial(U){
  const m = lampBase(), p = attribute('lp', 'vec2'), t = p.y.negate(), w = float(0.06).add(t.mul(0.42)), x = abs(p.x).div(w);
  const a = float(1).sub(smoothstep(0.3, 1.0, x)).mul(0.8).add(float(1).sub(smoothstep(0.0, 1.0, x.mul(0.55))).mul(0.22));
  const f = exp(t.mul(-0.75)).mul(smoothstep(0.02, 0.12, t));
  m.colorNode = vec4(toL(vec3(1.0, 0.7, 0.42)).mul(a).mul(f).mul(U.uL).mul(0.7), 1.0);
  m.maskNode = p.y.lessThanEqual(0);
  m.uniforms = U;
  return m;
}
// a pool of light on the ground: bright under the lamp, spreading softly a couple of metres
function poolMaterial(U, k, c){
  c = c || [1.0, 0.7, 0.42];
  const m = lampBase(); m.polygonOffset = true; m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4;
  const d = length(attribute('lp', 'vec2')), a = exp(d.mul(d).mul(-7.0)).mul(0.55).add(pow(max(float(1).sub(d), 0.0), 1.4).mul(0.5));
  m.colorNode = vec4(toL(vec3(c[0], c[1], c[2])).mul(a).mul(U.uL).mul(k), 1.0);
  m.maskNode = d.lessThan(1.0);
  m.uniforms = U;
  return m;
}

// ---------- a shape that only casts a shadow (the crowns of the trees round the plot), with gaps like foliage ----------
function shadowOnly(){
  const m = own(new THREE.MeshBasicNodeMaterial({ colorWrite:false, depthWrite:false }));
  const p = floor(positionWorld.mul(11.0));   // cells of 9 cm: the shadow map's filter blends them into a light dapple
  m.maskShadowNode = rand(vec2(p.x.add(p.y.mul(31.7)), p.z.add(p.y.mul(17.3)))).greaterThan(0.45);
  return m;
}

// ---------- obstacles out of the camera's way (Esteet pois kameran edestä) ----------
// A tree whose trunk comes within the set distance of the camera, short of the point looked at, is dropped whole in the
// vertex stage: all its corners go to one point, so nothing of it is drawn. An instanced tree carries its foot and
// height in the instance attribute tb (x, y, z, height); a single tree stands at its mesh's origin
function treeHide(mat, T, P, C){
  mat.positionNode = Fn((builder) => {
    const inst = builder.object.isInstancedMesh && builder.geometry.hasAttribute('tb');
    const tb = inst ? attribute('tb', 'vec4') : vec4(0.0, 0.0, 0.0, T.uTreeH.mul(1.3));
    const pos = positionLocal.toVar();
    // Vain tontti: a tree that stands outside the plot is away whole
    if (inst) If(C.uCut.greaterThan(0.5).and(plotIn(P, tb.xz).not()), () => { pos.assign(tb.xyz); });
    If(T.uTreeHide.greaterThan(0.0), () => {
      const w = modelWorldMatrix.mul(vec4(tb.xyz, 1.0)).xyz;
      const tq = vec3(w.x, clamp(T.uTreeCam.y, w.y, w.y.add(tb.w)), w.z).sub(T.uTreeCam);
      If(length(tq).lessThan(T.uTreeHide).and(dot(tq, T.uTreeFwd).lessThan(T.uTreeLt)).and(plotIn(P, w.xz).not()), () => { pos.assign(tb.xyz); });
    });
    return pos;
  })();
  return mat;
}
// the other obstacles off the plot (the neighbours' buildings, poles) are cut away where they come within the same
// distance in front of the camera, short of the point looked at
function obHide(mat, T, O, P){
  if (!mat || !mat.isNodeMaterial || mat.userData.ob) return mat;
  mat.userData.ob = true;
  const oq = positionWorld.sub(T.uTreeCam);
  addMask(mat, O.uObD.greaterThan(0.0).and(length(oq).lessThan(O.uObD)).and(dot(oq, T.uTreeFwd).lessThan(O.uObLt)).and(plotIn(P, positionWorld.xz).not()).not());
  mat.needsUpdate = true;
  return mat;
}

export const FX = {
  uniforms, data, mapOf, skyMaterial, grayAware, pitAware, cutAware, roadAware, holeCut, leafLit, boardMap, deckMap, hedgeMap,
  glassMaterial, interiorUniforms, interiorLit, fireMaterial, washMaterial, poolMaterial, shadowOnly, treeHide, obHide, plotOnly
};
