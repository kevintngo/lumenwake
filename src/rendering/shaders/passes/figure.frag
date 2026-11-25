in vec2 vUv;
out vec4 oColor;
uniform sampler2D uEnt;
#include <common>
#include <frame>
#include <pencil>
void main() {
  vec4 e = texture(uEnt, vec2(vUv.x, 1.0 - vUv.y));
  vec3 col = e.a > 0.002 ? e.rgb / e.a : vec3(0.0);
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.0 + 0.26 * CEL);
  oColor = vec4(saturate(col), saturate(e.a));
}
