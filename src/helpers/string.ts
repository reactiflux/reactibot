const NORMALIZED_CODEPOINTS = /[\u0300-\u036f]/g;
const EMOJI_RANGE =
  /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2500-\u26FF]|\uD83E[\uDD10-\uDDFF]/g;
const SPECIAL_CHARACTERS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001F]|[\u2000-\u24FF]|[≤≥¯˘÷¿…“”‘’«»–—≠±ºª•¶§∞¢£™¡`~`∑´®†¨ˆØ∏\-=_<>,;'"[\]\\{}|!@#$%^*()]/g;
export const simplifyString = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(NORMALIZED_CODEPOINTS, "")
    .replace(EMOJI_RANGE, "")
    .replace(SPECIAL_CHARACTERS, "");

export const extractEmoji = (s: string) => s.match(EMOJI_RANGE) || [];

const NEWLINE = /\n/g;
export const countLines = (s: string) => s.match(NEWLINE)?.length || 0;
