import fetch from "node-fetch";
import { gitHubToken } from "./env";

const LOOKUP_REGEX = /<Intro>\s*(.*?)\s*<\/Intro>/gs;
const LINK_REGEX = /\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g;

const BASE_URL =
  "https://api.github.com/repos/reactjs/react.dev/contents/src/content/reference/";

export const getReactDocsContent = async (searchPath: string) => {
  try {
    const response = await fetch(`${BASE_URL}${searchPath}.md`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${gitHubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const json = await response.json();
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
  const searchKey = REACT_AVAILABLE_DOCS.find((key) => {
    const matches = key.split("/");
    const name = matches[matches.length - 1];
    const namespace = matches.length <= 2 ? key : `${matches[0]}/${matches[2]}`;

    return (
      namespace.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase())
    );
  });
  return searchKey;
};

const processReactDocumentation = (content: string) => {
  const patchedContentLinks = content.replace(LINK_REGEX, (_, text, link) => {
    return `[${text}](https://react.dev${link})`;
  });

  const matches = [...patchedContentLinks.matchAll(LOOKUP_REGEX)];

  if (matches.length > 0) {
    const [introContent] = matches.map(([, match]) => match.trim());
    return introContent;
  }

  return null;
};

const REACT_AVAILABLE_DOCS = [
  "react/cache",
  "react/Children",
  "react/cloneElement",
  "react/Component",
  "react/createContext",
  "react/createElement",
  "react/createFactory",
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
  "react/use-client",
  "react/use-server",
  "react/use",
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
  "react-dom/hooks/useFormState",
  "react-dom/hooks/useFormStatus",
  "react-dom/server/renderToNodeStream",
  "react-dom/server/renderToPipeableStream",
  "react-dom/server/renderToReadableStream",
  "react-dom/server/renderToStaticMarkup",
  "react-dom/server/renderToStaticNodeStream",
  "react-dom/server/renderToString",
  "react-dom/unmountComponentAtNode",
  "react-dom/hydrate",
  "react-dom/render",
  "react-dom/createPortal",
  "react-dom/findDOMNode",
  "react-dom/flushSync",
];
