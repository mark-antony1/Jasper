const Query = require('./resolvers/Query')
const Mutation = require('./resolvers/Mutation')
const { prisma } = require('./generated/prisma-client')
const { GraphQLServer } = require('graphql-yoga')
const { DateTimeResolver, EmailAddressResolver, URLResolver, PhoneNumberResolver} = require('graphql-scalars');

const resolvers = {
	DateTime: DateTimeResolver,
  EmailAddress: EmailAddressResolver,
	URL: URLResolver,
	PhoneNumber: PhoneNumberResolver,
  Query,
  Mutation,
}

const server = new GraphQLServer({
  typeDefs: './schema.graphql',
  resolvers,
  context: request => {
    return {
      ...request,
      prisma,
    }
  },
})
server.start(() => console.log('Server is running on http://localhost:4000'))
