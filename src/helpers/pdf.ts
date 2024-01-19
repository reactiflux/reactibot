import { fromBuffer } from "pdf2pic";
import { Options } from "pdf2pic/dist/types/options";

const defaultOptions = {
  density: 100, // Higher density for better quality
  format: "png",
  width: 800, // Adjust as per requirement
  height: 600,
};

export const toPng = (buf: Buffer, options: Options) =>
  fromBuffer(buf, { ...defaultOptions, ...options })();
