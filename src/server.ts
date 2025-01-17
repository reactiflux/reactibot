import Fastify from "fastify";
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

const fastify = Fastify({ logger: true });

const openApiConfig = {
  openapi: "3.0.0",
  info: {
    title: "Job Board API",
    version: "1.0.0",
  },
  components: {
    schemas: {
      JobPost: {
        type: "object",
        required: ["tags", "description", "authorId", "message", "createdAt"],
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
          },
          description: { type: "string" },
          authorId: {
            type: "string",
            format: "snowflake",
          },
          message: {
            type: "object",
            description: "Discord Message object",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      JobBoardCache: {
        type: "object",
        required: ["forHire", "hiring"],
        properties: {
          forHire: {
            type: "array",
            items: { $ref: "JobPost" },
          },
          hiring: {
            type: "array",
            items: { $ref: "JobPost" },
          },
        },
      },
    },
  },
  paths: {
    "/jobs": {
      get: {
        tags: ["jobs"],
        summary: "Get all job posts",
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "JobBoardCache",
                },
              },
            },
          },
        },
      },
    },
  },
};

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
  "/jobs",
  {
    schema: {
      response: {
        200: {
          $ref: "JobBoardCache",
        },
      },
    },
  },
  async () => {
    const { hiring, forHire } = getJobPosts();

    return { hiring: hiring.map(renderPost), forHire: forHire };
  },
);

const renderPost = (post: StoredMessage): StoredMessage => {
  return {
    ...post,
    description: renderMdToHtml(compressLineBreaks(post.description)),
  };
};

await fastify.listen({ port: 3000, host: "0.0.0.0" });

const renderMdToHtml = (md: string) =>
  xss(marked(md, { async: false, gfm: true }));
