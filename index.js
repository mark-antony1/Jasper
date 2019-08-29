const { prisma } = require('./generated/prisma-client')
const { GraphQLServer } = require('graphql-yoga')
const { DateTimeResolver, EmailAddressResolver, URLResolver, PhoneNumberResolver, USCurrencyResolver} = require('graphql-scalars');

const resolvers = {
	DateTime: DateTimeResolver,
  EmailAddress: EmailAddressResolver,
	URL: URLResolver,
	PhoneNumber: PhoneNumberResolver,
	USCurrency: USCurrencyResolver,
  Query: {
    menuItem(root, args, context) {
      return context.prisma.menuItem({ id: args.menuItemId })
    },
    menuItemsByUser(root, args, context) {
      return context.prisma
        .user({
          id: args.userId,
        })
        .menuItems()
		},
		locationsByUser(root, args, context) {
			return context.prisma
			.user({
				id: args.userId,
			})
			.locations()
		},
		ordersByLocationAndStatus(root, args, context) {
			return context.prisma
			.location({
				id: args.locationId
			})
			.orders({
				status: args.status
			})
		},
		transactionsByDate(root, args, context) {
			return context.prisma.transactions({
				first: args.first,
				location: args.locationId,
				orderBy: args.orderBy
			})
		},
  },
  Mutation: {
    createUser(root, args, context) {
      return context.prisma.createUser({ 
				name: args.name, 
				email: args.email, 
				password: args.password 
			})
    },
  },
  User: {
    menuItems(root, args, context) {
      return context.prisma
        .user({
          id: root.id,
        })
        .menuItems()
    },
  },
  MenuItem: {
    author(root, args, context) {
      return context.prisma
        .menuItem({
          id: root.id,
        })
        .author()
    },
  },
}

const server = new GraphQLServer({
  typeDefs: './schema.graphql',
  resolvers,
  context: {
    prisma,
  },
})
server.start(() => console.log('Server is running on http://localhost:4000'))