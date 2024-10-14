import OGS from "open-graph-scraper";

export const og = async (options: Parameters<typeof OGS>[0]) => {
  try {
    return await OGS(options);
  } catch (e) {
    return e as Awaited<ReturnType<typeof OGS>>;
  }
};
