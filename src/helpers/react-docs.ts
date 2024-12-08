import fetch from "node-fetch";
import { gitHubReadToken } from "./env";

const LOOKUP_REGEX = /<Intro>\s*(.*?)\s*<\/Intro>/gs;
const LINK_REGEX = /\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g;

const EXTRACT_SEARCH_KEY_REGEX = /(?<=!(docs|react-docs)\s)[^\s.]+/;

const BASE_URL =
  "https://api.github.com/repos/reactjs/react.dev/contents/src/content/reference/";

export const getReactDocsContent = async (searchPath: string) => {
  try {
    const response = await fetch(`${BASE_URL}${searchPath}.md`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${gitHubReadToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const json = (await response.json()) as { content: string };
    const contentBase64 = json.content;
    const decodedContent = Buffer.from(contentBase64, "base64").toString(
      "utf8",
    );
    return processReactDocumentation(decodedContent);
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

export const getReactDocsSearchKey = (search: string) => {
  const normalizedSearch = search.toLowerCase();

  return REACT_AVAILABLE_DOCS.find((key) => {
    const keyParts = key.split("/");
    const name = keyParts[keyParts.length - 1];
    const namespace =
      keyParts.length <= 2 ? key : `${keyParts[0]}/${keyParts[2]}`;

    return (
      namespace.toLowerCase() === normalizedSearch ||
      name.toLowerCase() === normalizedSearch
    );
  });
};

export const extractSearchKey = (search: string) => {
  const matches = search.match(EXTRACT_SEARCH_KEY_REGEX);
  return matches ? matches[0] : "";
};

const processReactDocumentation = (content: string) => {
  const patchedContentLinks = content.replace(LINK_REGEX, (_, text, link) => {
    return `[${text}](https://react.dev${link})`;
  });

  const matches = [...patchedContentLinks.matchAll(LOOKUP_REGEX)];

  if (matches.length > 0) {
    const [introContent] = matches.map(([, match]) =>
      match.trim().replace(/\n\n/g, "\n"),
    );
    return introContent;
  }

  return null;
};

const REACT_AVAILABLE_DOCS = [
  "react/act",
  "react/cache",
  "react/Children",
  "react/cloneElement",
  "react/Component",
  "react/createContext",
  "react/createElement",
  "react/createRef",
  "react/experimental_taintObjectReference",
  "react/experimental_taintUniqueValue",
  "react/experimental_useEffectEvent",
  "react/forwardRef",
  "react/Fragment",
  "react/isValidElement",
  "react/lazy",
  "react/legacy",
  "react/memo",
  "react/Profiler",
  "react/PureComponent",
  "react/startTransition",
  "react/StrictMode",
  "react/Suspense",
  "react/use",
  "react/useActionState",
  "react/useCallback",
  "react/useContext",
  "react/useDebugValue",
  "react/useDeferredValue",
  "react/useEffect",
  "react/useId",
  "react/useImperativeHandle",
  "react/useInsertionEffect",
  "react/useLayoutEffect",
  "react/useMemo",
  "react/useOptimistic",
  "react/useReducer",
  "react/useRef",
  "react/useState",
  "react/useSyncExternalStore",
  "react/useTransition",
  "react-dom/client/createRoot",
  "react-dom/client/hydrateRoot",
  "react-dom/createPortal",
  "react-dom/flushSync",
  "react-dom/hooks/useFormStatus",
  "react-dom/preconnect",
  "react-dom/prefetchDNS",
  "react-dom/preinit",
  "react-dom/preinitModule",
  "react-dom/preload",
  "react-dom/preloadModule",
  "react-dom/server/renderToPipeableStream",
  "react-dom/server/renderToReadableStream",
  "react-dom/server/renderToStaticMarkup",
  "react-dom/server/renderToString",
  "react-dom/static/prerender",
  "react-dom/static/prerenderToNodeStream",
];
