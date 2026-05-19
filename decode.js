/**
 * Straddling checkerboard + columnar transposition, base64-wrapped.
 *
 *   encode(plaintext, keyphrase) -> ciphertext (base64 string)
 *   decode(ciphertext, keyphrase) -> plaintext
 *
 * The keyphrase is required — callers own where it comes from.
 * Letters and spaces only on the plaintext side; digits, punctuation,
 * and case are dropped on encode.
 */

const TOP = { A: "0", E: "1", I: "2", N: "3", O: "5", R: "6", S: "8", T: "9" };
const R4 = "BCDFGHJKLM";
const R7 = "PQUVWXYZ_.";

const ENC = { ...TOP };
[...R4].forEach((c, i) => (ENC[c] = `4${i}`));
[...R7].forEach((c, i) => (ENC[c] = `7${i}`));
const DEC = Object.fromEntries(Object.entries(ENC).map(([k, v]) => [v, k]));

const order = (key) =>
  [...key.toUpperCase()]
    .filter((c) => /[A-Z]/.test(c))
    .map((c, i) => [c, i])
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1))
    .map(([, i]) => i);

const toDigits = (text) =>
  [...text.toUpperCase().replace(/ /g, "_")]
    .filter((c) => c in ENC)
    .map((c) => ENC[c])
    .join("");

const fromDigits = (digits) => {
  let out = "", i = 0;
  while (i < digits.length) {
    const n = "47".includes(digits[i]) ? 2 : 1;
    out += DEC[digits.slice(i, i + n)];
    i += n;
  }
  return out.replace(/_/g, " ");
};

const transpose = (digits, key) => {
  const ord = order(key);
  const w = ord.length;
  const cols = Array.from({ length: w }, () => []);
  [...digits].forEach((d, i) => cols[i % w].push(d));
  return ord.map((c) => cols[c].join("")).join("");
};

const untranspose = (digits, key) => {
  const ord = order(key);
  const w = ord.length;
  const full = Math.floor(digits.length / w);
  const extra = digits.length % w;
  const lens = Array.from({ length: w }, (_, c) => full + (c < extra ? 1 : 0));
  const cols = new Array(w);
  let pos = 0;
  for (const c of ord) {
    cols[c] = digits.slice(pos, pos + lens[c]);
    pos += lens[c];
  }
  let out = "";
  for (let r = 0; r <= full; r++)
    for (let c = 0; c < w; c++)
      if (r < lens[c]) out += cols[c][r];
  return out;
};

export const encode = (text, key) =>
  Buffer.from(transpose(toDigits(text), key)).toString("base64");

export const decode = (ct, key) =>
  fromDigits(untranspose(Buffer.from(ct, "base64").toString(), key));
