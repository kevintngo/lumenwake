// What the page is running on. Read once, before anything rewrites the address.
//   ?touch     forces the touch interface (handy on a desktop);  ?touch=0 forces it off

const params = new URLSearchParams(location.search);

export const DEVICE = {
  /** True when fingers are the main way in: a phone or tablet. A first touch later also turns it on. */
  touch: params.has('touch') ? params.get('touch') !== '0' : matchMedia('(pointer: coarse)').matches,
};
