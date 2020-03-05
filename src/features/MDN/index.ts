import fetch from "node-fetch";
import Fuse, { FuseOptions } from "fuse.js";
import { JSDOM } from "jsdom";

export type MdnStoreCacheItem = { title: string; href: string };

const fuseOptions: FuseOptions<MdnStoreCacheItem> = {
  shouldSort: true,
  includeScore: true,
  threshold: 0.8,
  tokenize: true,
  location: 0,
  distance: 1000,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["title"]
};

type Store = {
  cache?: MdnStoreCacheItem[];
  fuse?: Fuse<MdnStoreCacheItem, typeof fuseOptions>;
};

let store: Store | null = null;

const buildStore = async () => {
  const obj: Store = {};
  const stringDOM = await fetch(
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Index"
  ).then(res => res.text());

  const { document } = new JSDOM(stringDOM).window;
  const queryResults = [
    ...document.querySelectorAll('#wikiArticle table tr td[rowspan="2"] > a')
  ] as HTMLAnchorElement[];

  obj.cache = queryResults.map<MdnStoreCacheItem>(r => ({
    title: r.textContent || "",
    href: r.href
  }));
  obj.fuse = new Fuse(obj.cache, fuseOptions);
  return obj;
};

export const MDN = {
  getStore: async () => {
    if (!store) store = await buildStore();
    return store;
  },
  baseUrl: `https://developer.mozilla.org`
};
