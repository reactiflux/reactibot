const fetch = require('node-fetch');
const Fuse = require('fuse.js');
const { JSDOM } = require('jsdom');

const fuseOptions = {
  shouldSort: true,
  includeScore: true,
  threshold: 0.8,
  tokenize: true,
  location: 0,
  distance: 1000,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ['title'],
};

const MDN = (() => {
  let store;

  const buildStore = async () => {
    const obj = {};
    const stringDOM = await fetch(
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Index'
    ).then(res => res.text());

    const { document } = new JSDOM(stringDOM).window;
    const queryResults = [
      ...document.querySelectorAll('#wikiArticle table tr td[rowspan="2"] > a'),
    ];

    obj.cache = queryResults.map(r => ({
      title: r.textContent,
      href: r.href,
    }));
    obj.fuse = new Fuse(obj.cache, fuseOptions);
    return obj;
  };

  return {
    getStore: async () => {
      if (!store) store = await buildStore();
      return store;
    },
    baseUrl: `https://developer.mozilla.org`,
  };
})();

module.exports = {
  MDN,
};
