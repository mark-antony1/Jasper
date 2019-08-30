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
				where: {
					status: args.status
				}
			})
		},
		transactionsByDate(root, args, context) {
			return context.prisma
			.location({
				id: args.locationId,
			})
			.transactions({
				orderBy: args.orderBy
			})
			.$fragment(
				`{ id createdAt menuItem { title price } }`
			 );
		},
  },
  Mutation: {
    createUser(root, args, context) {
      return context.prisma.createUser({ 
				name: args.name, 
				email: args.email, 
				password: args.password,
			})
		},
		createMenuItem(root, args, context) {
			return context.prisma.createMenuItem({
				price: args.price,
				title: args.title,
				pictureURL: args.pictureURL,
				author: {
					connect: {
						id: args.userId,
					}
				}
			})
		},
		createTransaction(root, args, context) {
			return context.prisma.createTransaction({
				menuItem: {
					connect: {
						id: args.menuItemId,
					}
				},
				location: {
					connect: {
						id: args.locationId,
					}
				}
			})
		},
		createOrder(root, args, context) {
			return context.prisma.createOrder({
				menuItem: {
					connect: {
						id: args.menuItemId,
					}
				},
				location: {
					connect: {
						id: args.locationId,
					}
				},
				status: "ORDERED"
			})
		},
		createLocation(root, args, context) {
			return context.prisma.createLocation({
				address: args.address,
				phoneNumber: args.phoneNumber,
				email: args.email,
				owner: {
					connect: {
						id: args.userId,
					}
				}
			})
		},
		updateUser(root, args, context) {
			return context.prisma.updateUser({
				where: { id: args.userId },
				data: { 
					password: args.password,
					email: args.email,
					name: args.name
				}
			})
		},
		updateOrder(root, args, context) {
			return context.prisma.updateOrder({
				where: { id: args.orderId },
				data: { status: args.status }
			})
		},
		updateMenuItem(root, args, context) {
			return context.prisma.updateMenuItem({
				where: { id: args.menuItemId },
				data: { 
					title: args.title,
					pictureURL: args.url,
					price: args.price
				}
			})
		},
		updateLocation(root, args, context) {
			return context.prisma.updateLocation({
				where: { id: args.locationId },
				data: { 
					address: args.address,
					email: args.email,
					phoneNumber: args.phoneNumber
				}
			})
		},
		deleteUser(root, args, context) {
			return context.prisma.deleteUser({
				id: args.userId
			})
		},
		deleteOrder(root, args, context) {
			return context.prisma.deleteOrder({
				id: args.orderId
			})
		},
		deleteLocation(root, args, context) {
			return context.prisma.deleteLocation({
				id: args.locationId
			})
		},
		deleteMenuItem(root, args, context) {
			return context.prisma.deleteMenuItem({
				id: args.menuItemId
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