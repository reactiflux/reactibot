import Fastify, { FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import { marked } from "marked";
import xss from "xss";
import {
  StoredMessage,
  getJobPosts,
} from "./features/jobs-moderation/job-mod-helpers.js";
import { compressLineBreaks } from "./helpers/string.js";
import { constructDiscordLink } from "./helpers/discord.js";
import { reactibotApiKey } from "./helpers/env.js";

const fastify = Fastify({ logger: true });

const MAX_LIMIT = 50;

const openApiConfig = {
  openapi: "3.0.0",
  info: {
    title: "Job Board API",
    version: "1.0.0",
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: "apiKey",
        name: "api-key",
        in: "header",
      },
    },
    security: [{ apiKey: [] }],
    schemas: {
      PaginationParams: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            minimum: 1,
            maximum: MAX_LIMIT,
            default: 10,
            description: "Number of items to return",
          },
          offset: {
            type: "integer",
            minimum: 0,
            default: 0,
            description: "Number of items to skip",
          },
        },
      },

      JobPost: {
        type: "object",
        required: ["tags", "description", "authorId", "message", "createdAt"],
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
          },
          description: { type: "string" },
          author: {
            type: "object",
            requried: ["username", "displayName", "avatar"],
            properties: {
              username: { type: "string" },
              displayName: { type: "string" },
              avatar: { type: "string" },
            },
          },
          messageLink: { type: "string" },
          reactions: {
            type: "array",
            items: { type: "string" },
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      JobBoardCache: {
        count: { type: "number" },
        pages: { type: "number" },
        page: { type: "number" },
        limit: { type: "number" },
        data: {
          type: "array",
          items: { $ref: "JobPost" },
        },
      },
      paths: {
        "/jobs/forhire": {
          get: {
            tags: ["jobs"],
            summary: "Get all job posts",
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: { $ref: "JobBoardCache" },
                  },
                },
              },
            },
          },
        },
        "/jobs/hiring": {
          get: {
            tags: ["jobs"],
            summary: "Get all job posts",
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: { $ref: "JobBoardCache" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

fastify.addHook("onRequest", async (request, reply) => {
  const apiKey = request.headers["api-key"];
  console.log("onreq");
  if (apiKey !== reactibotApiKey) {
    reply.code(401).send({ error: "Unauthorized" });
    return;
  }
});

try {
  Object.entries(openApiConfig.components.schemas).forEach(([k, schema]) => {
    fastify.addSchema({ ...schema, $id: k });
  });
  // @ts-expect-error something's busted but it works
  await fastify.register(swagger, openApiConfig);
  await fastify.register(cors);
  await fastify.register(helmet);
} catch (e) {
  console.log(e);
}

fastify.get(
  "/jobs/hiring",
  {
    schema: {
      response: {
        200: {
          $ref: "JobBoardCache",
        },
      },
    },
  },
  async (req) => {
    const { page, limit } = getPaginationFromRequest(req);
    const { hiring } = getJobPosts();

    return paginateResponse(page, limit, hiring.map(renderPost));
  },
);
fastify.get(
  "/jobs/forhire",
  {
    schema: {
      querystring: {
        $ref: "PaginationParams",
      },
      response: {
        200: {
          $ref: "JobBoardCache",
        },
      },
    },
  },
  async (req) => {
    const { page, limit } = getPaginationFromRequest(req);
    const { forHire } = getJobPosts();

    return paginateResponse(page, limit, forHire.map(renderPost));
  },
);

const DEFAULT_LIMIT = 10;
const getPaginationFromRequest = (req: FastifyRequest) => {
  const { page, limit } = req.query as { page?: string; limit?: string };
  let outPage: number, outLimit: number;
  if (!page) {
    outPage = 1;
  } else {
    outPage = parseInt(page);
    if (isNaN(outPage)) outPage = 1;
  }
  if (!limit) {
    outLimit = DEFAULT_LIMIT;
  } else {
    outLimit = parseInt(limit);
    if (isNaN(outLimit)) outLimit = DEFAULT_LIMIT;
    if (outLimit > MAX_LIMIT) outLimit = MAX_LIMIT;
  }
  return { page: outPage, limit: outLimit };
};

const paginateResponse = <T extends Array<any>>(
  page: number,
  limit: number,
  data: T,
) => {
  const offset = (page - 1) * limit;
  return {
    count: data.length,
    data: data.slice(offset, offset + limit),
    page,
    limit,
    pages: Math.ceil(data.length / limit),
  };
};

interface RenderedPost extends Omit<StoredMessage, "message" | "authorId"> {
  reactions: [string, number][];
  messageLink: string;
  author: {
    username: string;
    displayName: string;
    avatar: string;
  };
}

const renderPost = (post: StoredMessage): RenderedPost => {
  return {
    tags: post.tags,
    type: post.type,
    createdAt: post.createdAt,
    description: renderMdToHtml(compressLineBreaks(post.description)),
    messageLink: constructDiscordLink(post.message),
    reactions: post.message.reactions.cache.map((r) => [
      r.emoji.name ?? "☐",
      r.count,
    ]),
    author: {
      username: post.message.author.username,
      displayName: post.message.author.displayName,
      avatar: post.message.author.displayAvatarURL({
        size: 128,
        extension: "jpg",
        forceStatic: true,
      }),
    },
  };
};

await fastify.listen({ port: 3000, host: "0.0.0.0" });

const renderMdToHtml = (md: string) =>
  xss(marked(md, { async: false, gfm: true }));
