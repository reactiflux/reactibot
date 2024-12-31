import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
    },
  },
});

// Swagger documentation
const swaggerConfig = {
  swagger: {
    info: {
      title: "API Documentation",
      version: "1.0.0",
    },
  },
};

// Register plugins
await fastify.register(cors);
await fastify.register(helmet);
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
await fastify.register(swagger, swaggerConfig);

// Example route with schema validation
// fastify.get(
//   "/items",
//   {
//     schema: {
//       response: {
//         200: {
//           type: "array",
//           items: {
//             type: "object",
//             properties: {
//               id: { type: "string" },
//               name: { type: "string" },
//             },
//           },
//         },
//       },
//     },
//   },
//   async (request, reply) => {
//     return [{ id: "1", name: "Item 1" }];
//   },
// );

fastify.get(
  "/",
  {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            hello: { type: "string" },
          },
        },
      },
    },
  },
  async () => {
    return { hello: "world" };
  },
);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: "Internal Server Error" });
});

try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
