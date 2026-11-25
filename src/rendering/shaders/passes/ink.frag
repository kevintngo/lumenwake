in vec2 vUv;
out vec4 oEdge;
uniform sampler2D uGbuf;
uniform vec2 uTexel;
#include <common>
#include <frame>

float family(float id) { return id < 0.08 ? step(0.0, id) * 0.02 : id; }

void main() {
  vec4 gc = texture(uGbuf, vUv);
  vec4 n[4];
  n[0] = texture(uGbuf, vUv - vec2(uTexel.x, 0.0)); n[1] = texture(uGbuf, vUv + vec2(uTexel.x, 0.0));
  n[2] = texture(uGbuf, vUv - vec2(0.0, uTexel.y)); n[3] = texture(uGbuf, vUv + vec2(0.0, uTexel.y));
  float fc = family(gc.w);
  vec3 n0 = octDecode(gc.xy);
  float mean = 0.0, sil = 0.0, fold = 0.0, far = 0.0;
  for (int i = 0; i < 4; i++) {
    mean += n[i].z * 0.25;
    far = max(far, n[i].z);
    float fn = family(n[i].w);
    bool differ = abs(fn - fc) > 0.004;
    bool behind = n[i].z < gc.z * 0.985;
    bool level = abs(n[i].z - gc.z) <= gc.z * 0.015;
    if (differ && (behind || (level && fn > fc))) sil = 1.0;
    fold = max(fold, 1.0 - dot(n0, octDecode(n[i].xy)));
  }
  float crease = smoothstep(0.02, 0.06, abs(mean - gc.z) * 4.0 / max(gc.z, 1.0)) * step(mean, gc.z);
  fold = smoothstep(0.35, 0.8, fold) * step(0.08, gc.w);
  float line = max(max(crease, sil), fold * 0.85);
  if (gc.z > 5000.0 && far > 5000.0) line = 0.0;

  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 rd = normalize(uCamFwd + uCamRight * (ndc.x * uTanFov.x) + uCamUp * (ndc.y * uTanFov.y));
  float t = min(gc.z, far);
  vec3 p = uCamPos + rd * t;
  float fade = (1.0 - 0.55 * smoothstep(30.0, 100.0, t)) * (1.0 - smoothstep(VIEW_DIST * 0.7, VIEW_DIST * 0.95, length(p.xz - uFocus.xz)));
  oEdge = vec4(line, fract(gc.w * 37.0), fade, 1.0);
}
