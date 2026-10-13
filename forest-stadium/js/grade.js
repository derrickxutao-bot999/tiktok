"use strict";
/* grade.js — WebGL2 post-processing.
   scene canvas -> bloom (13-tap down / tent up mip chain) -> halation -> white balance & exposure
   -> filmic shoulder -> selective saturation (keep reds) -> contrast -> split toning -> lift/gamma/gain
   -> vignette -> grain; the overlay canvas (subtitles) is composited ungraded on top. */
const LOOK0 = {
  exposure: 0, temp: 0, tint: 0, sat: 1, redKeep: 0, contrast: 1, pivot: .45, split: 0,
  bloom: .2, hal: 0, thresh: .72, knee: .35, vig: .45, grain: .05, ca: .6, weave: .35, fade: 0, flash: 0,
  lift: [0, 0, 0], gam: [1, 1, 1], gain: [1, 1, 1], shT: [0, 0, 0], hiT: [0, 0, 0],
};
const look = o => Object.assign({}, LOOK0, o);
function mixLook(a, b, k) {
  const o = {};
  for (const key in LOOK0) { const x = a[key], y = b[key]; o[key] = Array.isArray(x) ? x.map((v, i) => lerp(v, y[i], k)) : lerp(x, y, k); }
  return o;
}

const Grade = (() => {
  let gl, P = {}, srcTex, ovTex;
  const mips = [];
  const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  const HEAD = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D s; uniform vec2 tx;
vec3 lin(vec3 c){ return pow(max(c, 0.), vec3(2.2)); }
`;
  const DOWN13 = `
vec3 down13(){
  vec3 a=T(-2.,2.), b=T(0.,2.), c=T(2.,2.), d=T(-2.,0.), e=T(0.,0.), f=T(2.,0.);
  vec3 g=T(-2.,-2.), h=T(0.,-2.), i=T(2.,-2.), j=T(-1.,1.), k=T(1.,1.), l=T(-1.,-1.), m=T(1.,-1.);
  return e*.125 + (a+c+g+i)*.03125 + (b+d+f+h)*.0625 + (j+k+l+m)*.125;
}`;
  const PRE = HEAD + `uniform float th, kn;
vec3 T(float x, float y){ return lin(texture(s, uv + tx * vec2(x, y)).rgb); }` + DOWN13 + `
void main(){
  vec3 c = down13();
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - th + kn, 0., 2. * kn); rq = rq * rq / (4. * kn + 1e-4);
  o = vec4(c * max(rq, br - th) / max(br, 1e-4), 1.);
}`;
  const DOWN = HEAD + `vec3 T(float x, float y){ return texture(s, uv + tx * vec2(x, y)).rgb; }` + DOWN13 + `
void main(){ o = vec4(down13(), 1.); }`;
  const UP = HEAD + `
void main(){
  vec4 d = tx.xyxy * vec4(1., 1., -1., 0.);
  vec3 c = texture(s, uv - d.xy).rgb + texture(s, uv - d.wy).rgb * 2. + texture(s, uv - d.zy).rgb
         + texture(s, uv + d.zw).rgb * 2. + texture(s, uv).rgb * 4. + texture(s, uv + d.xw).rgb * 2.
         + texture(s, uv + d.zy).rgb + texture(s, uv + d.wy).rgb * 2. + texture(s, uv + d.xy).rgb;
  o = vec4(c / 16., 1.);
}`;
  const COMP = HEAD + `
uniform sampler2D bl, ov;
uniform vec2 res; uniform float frame;
uniform float exposure, temp, tint, sat, redKeep, contrast, pivot, split, bloom, hal, vig, grain, ca, fade, flash, weave;
uniform vec3 lift, gam, gain, shT, hiT;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
vec3 shoulder(vec3 x){ float k = .8; vec3 e = max(x - k, 0.); return min(x, vec3(k)) + (1. - k) * (1. - exp(-e / (1. - k))); }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
void main(){
  vec2 u = uv + vec2(sin(frame * .71), cos(frame * .53)) * weave / res;
  vec2 d = u - .5;
  vec2 off = d * dot(d, d) * ca * .02;
  vec3 c = lin(vec3(texture(s, u + off).r, texture(s, u).g, texture(s, u - off).b));
  vec3 b = texture(bl, u).rgb;
  c += b * bloom + b * vec3(1., .3, .08) * hal;
  c *= vec3(1. + .1 * temp, 1. - .06 * tint, 1. - .1 * temp) * exp2(exposure);
  c = pow(shoulder(c), vec3(1. / 2.2));
  float L = luma(c), mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float red = smoothstep(.06, .25, mx - mn) * smoothstep(.35, .6, (c.r - max(c.g, c.b)) / max(mx, .001));
  c = mix(vec3(L), c, mix(sat, 1.12, red * redKeep));
  c = (c - pivot) * contrast + pivot;
  L = clamp(luma(c), 0., 1.);
  c += (shT * (1. - L) * (1. - L) + hiT * L * L) * split;
  c = c * gain + lift * (1. - c);
  c = pow(max(c, 0.), 1. / gam);
  c *= mix(1., 1. - smoothstep(.32, .98, length(d * vec2(1.05, .95)) * 1.28), vig);
  float n = vnoise(gl_FragCoord.xy / 1.6 + vec2(frame * 17.31, frame * -9.73)) - .5;
  c += n * grain * (.55 + .9 * (1. - min(abs(luma(c) - .42) * 1.7, 1.)));
  vec4 t = texture(ov, uv);
  c = c * (1. - t.a) + t.rgb;
  c = mix(mix(c, vec3(0.), fade), vec3(1.), flash);
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

  function compile(fs) {
    const pr = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(pr, sh);
    }
    gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); i < n; i++) { const info = gl.getActiveUniform(pr, i); u[info.name] = gl.getUniformLocation(pr, info.name); }
    return { pr, u };
  }
  function tex(w, h, internal, format, type) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  }
  function init(canvas) {
    gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 unavailable");
    gl.getExtension("EXT_color_buffer_float");
    P.pre = compile(PRE); P.down = compile(DOWN); P.up = compile(UP); P.comp = compile(COMP);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.bindVertexArray(gl.createVertexArray()); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    srcTex = tex(W, H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE); ovTex = tex(W, H, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    let w = W >> 1, h = H >> 1;
    for (let i = 0; i < 6; i++) {
      const t = tex(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT), fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      mips.push({ t, fb, w, h }); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
    }
  }
  function upload(t, canvas, premult) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premult);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }
  function pass(p, fb, w, h, set) { gl.useProgram(p.pr); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); set(p.u); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function render(scene, overlay, L, frame) {
    gl.activeTexture(gl.TEXTURE0);
    upload(ovTex, overlay, true); upload(srcTex, scene, false);
    gl.disable(gl.BLEND);
    pass(P.pre, mips[0].fb, mips[0].w, mips[0].h, u => { gl.uniform1i(u.s, 0); gl.uniform2f(u.tx, 1 / W, 1 / H); gl.uniform1f(u.th, L.thresh); gl.uniform1f(u.kn, L.knee); });
    for (let i = 1; i < mips.length; i++) {
      gl.bindTexture(gl.TEXTURE_2D, mips[i - 1].t);
      pass(P.down, mips[i].fb, mips[i].w, mips[i].h, u => { gl.uniform1i(u.s, 0); gl.uniform2f(u.tx, 1 / mips[i - 1].w, 1 / mips[i - 1].h); });
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = mips.length - 2; i >= 0; i--) {
      gl.bindTexture(gl.TEXTURE_2D, mips[i + 1].t);
      pass(P.up, mips[i].fb, mips[i].w, mips[i].h, u => { gl.uniform1i(u.s, 0); gl.uniform2f(u.tx, 1 / mips[i + 1].w, 1 / mips[i + 1].h); });
    }
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mips[0].t);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ovTex);
    pass(P.comp, null, W, H, u => {
      const f1 = (n, v) => u[n] && gl.uniform1f(u[n], v), f3 = (n, v) => u[n] && gl.uniform3f(u[n], v[0], v[1], v[2]);
      gl.uniform1i(u.s, 0); u.bl && gl.uniform1i(u.bl, 1); u.ov && gl.uniform1i(u.ov, 2);
      u.res && gl.uniform2f(u.res, W, H); f1("frame", frame);
      for (const k of ["exposure", "temp", "tint", "sat", "redKeep", "contrast", "pivot", "split", "bloom", "hal", "vig", "grain", "ca", "fade", "flash", "weave"]) f1(k, L[k]);
      for (const k of ["lift", "gam", "gain", "shT", "hiT"]) f3(k, L[k]);
    });
    for (const unit of [gl.TEXTURE2, gl.TEXTURE1]) { gl.activeTexture(unit); gl.bindTexture(gl.TEXTURE_2D, null); }
    gl.activeTexture(gl.TEXTURE0);
  }
  return { init, render };
})();
