import OGS from "open-graph-scraper/dist/index.js";
import type { ErrorResult, SuccessResult } from "open-graph-scraper";
import type { OpenGraphScraperOptions } from "open-graph-scraper/dist/lib/types.js";

export const og = async (
  options: OpenGraphScraperOptions,
): Promise<SuccessResult | ErrorResult> => {
  try {
    // @ts-expect-error because OGS types are shitty
    return await OGS(options);
  } catch (e) {
    return e as ErrorResult;
  }
};
