void paintEyes(inout Surf s, vec3 f, float spread, vec2 size, float seed) {
  float blink = step(0.96, fract(uTime * 0.21 + seed));
  float side = f.x < 0.0 ? -1.0 : 1.0;
  vec2 sz = size * (1.0 + 0.07 * side);
  vec2 e = vec2(f.x - side * spread, f.y);
  float eye = smoothstep(1.0, 0.85, length(e / vec2(sz.x, mix(sz.y, sz.y * 0.12, blink))));
  float glint = smoothstep(sz.x * 0.42, sz.x * 0.26, length(e - vec2(-sz.x * 0.33, sz.y * 0.36))) * (1.0 - blink);
  if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0 - glint; s.solid = 1.0; s.ink = 0.0; }
}
