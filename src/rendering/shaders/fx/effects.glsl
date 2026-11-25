vec4 fx_mote(vec2 uv, float life, float seed, vec4 col) {
  float show = step(0.08, life) * step(life, 0.92);
  return mark(col.rgb, body(length(uv) - 0.55) * show * min(col.a, 1.0) * 0.85);
}

vec4 fx_leaf(vec2 uv, float life, float seed, vec4 col) {
  float flip = cos(life * 22.0 + seed * 40.0);
  vec2 q = vec2(uv.x, uv.y / max(abs(flip), 0.25));
  float d = length(q * vec2(1.0, 1.9)) - 0.8;
  float show = step(0.05, life) * step(life, 0.95) * col.a;
  return over(mark(FX_INK, pen(d) * 0.7 * show), mark(mix(FX_PAPER, col.rgb, 0.85), body(d) * show));
}

vec4 fx_spark(vec2 uv, float life, float seed, vec4 col) {
  vec2 a = abs(uv) / mix(1.0, 0.35, life);
  float d = min(a.x * 4.5 + a.y, a.y * 4.5 + a.x) - 0.95;
  return over(mark(FX_INK, pen(d) * 0.9), mark(mix(FX_PAPER, col.rgb, 0.55 * hatch(uv, seed)), body(d)));
}

vec4 fx_burst(vec2 uv, float life, float seed, vec4 col) {
  float r = length(uv), ang = atan(uv.y, uv.x);
  float front = mix(0.4, 0.95, sqrt(life));
  float spike = abs(fract(ang * 1.4324 + seed) - 0.5) * 2.0;
  float d = r - front * mix(0.5, 1.0, spike);
  float rays = step(0.86, fract(ang * 2.2282 + seed * 3.0)) * step(front * 0.95, r) * step(r, front * 1.25 + 0.05);
  float show = step(life, 0.8);
  vec4 star = over(mark(FX_INK, pen(d)), mark(mix(FX_PAPER, col.rgb, 0.5 * hatch(uv, seed)), body(d)));
  return over(mark(FX_INK, rays * 0.9), star) * show;
}

vec4 fx_slash(vec2 uv, float life, float seed, vec4 col) {
  float r = length(uv), ang = atan(uv.x, uv.y);
  float head = mix(1.9, -1.5, smoothstep(0.0, 0.55, life));
  float along = ang - head;
  float sweep = step(0.0, along) * step(along, 1.9);
  float taper = saturate(1.0 - along / 1.9);
  float outer = r - 0.97, inner = (0.97 - 0.3 * taper) - r;
  float d = max(outer, inner);
  float show = step(life, 0.72) * sweep;
  float lines = (pen(r - 0.8) + pen(r - 0.66)) * step(1.0, along) * step(along, 2.6) * step(life, 0.6) * 0.7;
  vec4 blade = over(mark(FX_INK, pen(d) * show), mark(mix(FX_PAPER, col.rgb, 0.35 * hatch(uv, seed)), body(d) * show));
  return over(blade, mark(FX_INK, lines));
}

vec4 fx_ring(vec2 uv, float life, float seed, vec4 col) {
  float front = mix(0.25, 0.92, 1.0 - (1.0 - life) * (1.0 - life));
  float a = pen(wobbly(uv, seed) - front) + pen(wobbly(uv, seed + 0.37) - front * 0.94) * 0.6;
  return mark(col.rgb * 0.82, saturate(a) * step(life, 0.9) * min(col.a, 1.0));
}

vec4 fx_halo(vec2 uv, float life, float seed, vec4 col) {
  float r = wobbly(uv, seed);
  float ang = atan(uv.y, uv.x) + floor(uTime * 6.0) * (seed > 0.5 ? 0.21 : -0.21);
  float arc = step(0.2, abs(fract(ang / 6.2832 * 6.0 + seed) - 0.5) * 2.0);
  float show = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.6, life) * min(col.a, 1.0);
  float band = body(abs(r - 0.86) - 0.05) * arc;
  float lines = max(pen(r - 0.91), pen(r - 0.81)) * arc;
  return over(mark(col.rgb * 0.8, lines * show), mark(mix(FX_PAPER, col.rgb, 0.45), band * show * 0.9));
}

vec4 fx_orb(vec2 uv, float life, float seed, vec4 col) {
  float r = length(uv), ang = atan(uv.y, uv.x);
  float turn = floor(uTime * 12.0) * 0.7;
  float d = wobbly(uv, seed + turn * 0.1) - 0.55;
  float swirl = smoothstep(0.25, 0.1, abs(fract(r * 2.6 - ang / 6.2832 + turn * 0.3) - 0.5));
  float rays = step(0.8, fract(ang * 1.2732 + turn * 0.21)) * step(0.68, r) * step(r, 0.95);
  vec4 ball = over(mark(FX_INK, pen(d)), mark(mix(FX_PAPER, col.rgb, swirl * 0.9), body(d)));
  return over(ball, mark(col.rgb * 0.8, rays * 0.9));
}

vec4 fx_puff(vec2 uv, float life, float seed, vec4 col) {
  float d = length(uv - vec2(0.0, 0.05)) - 0.5;
  d = min(d, length(uv - vec2(0.38, -0.1)) - 0.36);
  d = min(d, length(uv - vec2(-0.4, -0.08)) - 0.38);
  d += 0.5 * smoothstep(0.3, 1.0, life);
  float show = step(life, 0.9) * min(col.a * 1.6, 1.0);
  return over(mark(FX_INK, pen(d) * 0.8 * show), mark(mix(FX_PAPER, col.rgb, 0.3), body(d) * show));
}

vec4 fx_heal(vec2 uv, float life, float seed, vec4 col) {
  vec2 a = abs(uv);
  float d = min(max(a.x - 0.22, a.y - 0.75), max(a.y - 0.22, a.x - 0.75));
  float show = step(0.08, life) * step(life, 0.85);
  return over(mark(FX_INK, pen(d) * show), mark(mix(FX_PAPER, col.rgb, 0.4 + 0.6 * hatch(uv, seed)), body(d) * show));
}

vec4 fx_mark(vec2 uv, float life, float seed, vec4 col) {
  float ang = atan(uv.y, uv.x) + floor(uTime * 6.0) * 0.26;
  float dash = step(0.3, abs(fract(ang / 6.2832 * 5.0) - 0.5) * 2.0);
  float a = pen(wobbly(uv, seed) - 0.84) * dash + pen(wobbly(uv, seed + 0.5) - 0.7) * 0.35;
  return mark(col.rgb * 0.85, saturate(a) * min(col.a, 1.0));
}

vec4 fx_click(vec2 uv, float life, float seed, vec4 col) {
  float front = mix(0.9, 0.3, life);
  vec2 a = abs(uv);
  float m = pen(wobbly(uv, seed) - front) + pen(min(a.x, a.y)) * step(max(a.x, a.y), 0.16);
  return mark(FX_INK, saturate(m) * step(life, 0.85));
}

vec4 fx_beam(vec2 uv, float life, float seed, vec4 col) {
  float wide = 0.42 * sin(saturate(life) * 3.1416);
  float d = abs(uv.x + 0.03 * sin(uv.y * 5.0 + seed * 9.0)) - wide;
  float within = step(-0.95, uv.y) * step(uv.y, 0.98);
  float rise = floor(uTime * 12.0) / 12.0;
  vec2 tk = vec2(uv.x * 3.0, uv.y * 2.2 - rise * 3.0);
  vec2 tc = floor(tk);
  float tick = step(0.6, hash12(tc + seed)) * pen((fract(tk.x) - 0.5) / 3.0) * step(abs(fract(tk.y) - 0.5), 0.3) * body(d);
  vec4 shaft = over(mark(FX_INK, pen(d) * 0.8 * within), mark(FX_PAPER, body(d) * within * 0.92));
  return over(mark(col.rgb * 0.85, tick * within), shaft);
}

vec4 fx_zone(vec2 uv, float life, float seed, vec4 col) {
  float r = wobbly(uv, seed);
  float rim = pen(r - 0.93) + pen(wobbly(uv, seed + 0.37) - 0.88) * 0.5;
  float fill = body(r - 0.9 * mix(0.12, 1.0, life)) * hatch(uv, seed) * 0.5;
  return mark(col.rgb * 0.82, saturate(max(rim, fill)) * min(col.a, 1.0));
}

vec4 fx_lane(vec2 uv, float life, float seed, vec4 col) {
  vec2 a = abs(uv);
  float sides = (1.0 - smoothstep(1.1 * gPx2.x, 2.1 * gPx2.x, abs(a.x - 0.9))) * step(a.y, 0.98)
              + (1.0 - smoothstep(1.1 * gPx2.y, 2.1 * gPx2.y, abs(a.y - 0.98))) * step(a.x, 0.9) * 0.6;
  float along = uv.y * 4.0 - 0.5;
  float v = fract(along) - 0.5;
  float arrows = pen(abs(uv.x) * 0.55 + v * 0.5 - 0.1) * step(a.x, 0.62) * 0.7;
  float fill = step(uv.y, mix(-1.0, 1.0, life)) * step(a.x, 0.9) * hatch(uv * vec2(1.0, 4.0), seed) * 0.42;
  return mark(col.rgb * 0.82, saturate(max(max(sides, arrows), fill)) * min(col.a, 1.0));
}

vec4 fx_cloud(vec2 uv, float life, float seed, vec4 col) {
  float ang = atan(uv.y, uv.x), r = length(uv);
  float turn = floor(uTime * 6.0) * 0.21;
  float edge = 0.86 + 0.07 * abs(sin(ang * 5.5 + seed * 9.0 + turn));
  float fade = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.82, 1.0, life));
  float rim = pen(r - edge);
  float fill = body(r - edge) * hatch(uv, seed + turn) * 0.34;
  vec2 g = uv * 5.0 + vec2(turn, -turn * 0.7);
  float specks = body(length(fract(g) - 0.5 - (hash22(floor(g) + seed) - 0.5) * 0.5) - 0.11) * body(r - edge) * step(0.55, hash12(floor(g) + seed * 3.0));
  return mark(col.rgb * 0.8, saturate(max(max(rim * 0.8, fill), specks * 0.8)) * fade * min(col.a, 1.0));
}

vec4 fx_ripple(vec2 uv, float life, float seed, vec4 col) {
  float front = mix(0.2, 0.9, life);
  return mark(vec3(0.227, 0.502, 0.659), pen(wobbly(uv, seed) - front) * step(life, 0.85) * min(col.a, 1.0));
}
