import { AttachmentBuilder } from "discord.js";
import fetch from "node-fetch";
import { fromBase64 } from "pdf2pic";
import { Options } from "pdf2pic/dist/types/options";

const defaultOptions = {
  density: 200,
  format: "png",
  width: 1654,
  height: 2338,
} as Options;

const PAGES_TO_CONVERT = -1; // Convert all pages

const convertToPNG = (buffer: ArrayBuffer, options?: Options) =>
  // @ts-expect-error fromBase64 is not typed correctly, it works with ArrayBuffer
  fromBase64(buffer, { ...defaultOptions, ...options }).bulk(PAGES_TO_CONVERT, {
    responseType: "buffer",
  });

export const createAttachmentBuilderFromURL = async (
  url: string,
  name: string,
) => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch PDF: ${res.statusText}`);
      return null;
    }

    const pdfBuffer = await res.arrayBuffer();
    if (!pdfBuffer) {
      console.error(`Failed to convert PDF to image`);
      return null;
    }

    const buffer = await convertToPNG(pdfBuffer);
    if (!buffer.length) {
      console.error(`Failed to convert PDF to image`);
      return null;
    }

    return buffer.reduce<AttachmentBuilder[]>((acc, { buffer }) => {
      if (buffer) {
        acc.push(
          new AttachmentBuilder(buffer, { name: `${name}-${acc.length}.png` }),
        );
      }
      return acc;
    }, []);
  } catch (error: unknown) {
    console.error(`Error fetching PDF: ${error}`);
    return null;
  }
};
