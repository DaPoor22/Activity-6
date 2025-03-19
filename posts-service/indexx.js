const { ApolloServer } = require("apollo-server");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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
`;

const resolvers = {
  Query: {
    posts: () => prisma.post.findMany(),
    post: (_, { id }) => prisma.post.findUnique({ where: { id } }),
  },
  Mutation: {
    createPost: (_, { title, content }) =>
      prisma.post.create({ data: { title, content } }),
    updatePost: (_, { id, title, content }) =>
      prisma.post.update({ where: { id }, data: { title, content } }),
    deletePost: (_, { id }) => prisma.post.delete({ where: { id } }),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
