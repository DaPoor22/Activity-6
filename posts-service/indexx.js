const { ApolloServer } = require("@apollo/server");
const { PrismaClient } = require("@prisma/client");
const { createServer } = require("http");
const express = require("express");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const cors = require("cors");
const { ApolloServerPluginDrainHttpServer } = require("@apollo/server/plugin/drainHttpServer");
const { PubSub } = require("graphql-subscriptions");
const { expressMiddleware } = require("@apollo/server/express4");

const prisma = new PrismaClient();
const pubsub = new PubSub();

const typeDefs = `
  type Post {
    id: Int!
    title: String!
    content: String!
  }

  type Query {
    posts: [Post]
    post(id: Int!): Post
  }

  type Mutation {
    createPost(title: String!, content: String!): Post
    updatePost(id: Int!, title: String, content: String): Post
    deletePost(id: Int!): Post
  }

  type Subscription {
    postCreated: Post
  }
`;

const resolvers = {
  Query: {
    posts: () => prisma.post.findMany(),
    post: (_, { id }) => prisma.post.findUnique({ where: { id } }),
  },
  Mutation: {
    createPost: async (_, { title, content }) => {
      const newPost = await prisma.post.create({ data: { title, content } });
      pubsub.publish("POST_CREATED", { postCreated: newPost });
      return newPost;
    },
    updatePost: (_, { id, title, content }) =>
      prisma.post.update({ where: { id }, data: { title, content } }),
    deletePost: (_, { id }) => prisma.post.delete({ where: { id } }),
  },
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterableIterator(["POST_CREATED"]), // FIXED
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
const httpServer = createServer(app);

// WebSocket Server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});
const serverCleanup = useServer({ schema }, wsServer);

// Apollo Server
const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

// Start the Server
(async () => {
  await server.start(); // FIXED
  app.use("/graphql", cors(), express.json(), expressMiddleware(server)); // FIXED

  const PORT = 4001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}/graphql`);
  });
})();
