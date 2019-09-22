const { getUserId } = require('../utils')


async function menuItem(root, args, context) {
	getUserId(context)

	const locations = await context.prisma
	.locations({
		where: {
			owner: {
				id: userId
			}
		}
	})

	return context.prisma
	.menuItem({ 
		where: {
			location: {
				id: locations[0].id
			}
		},
	})
}

function user(root, args, context) {
	console.log('llllllx')
	const userId = getUserId(context)
	return context.prisma
	.user({
		id: userId,
	})
	.$fragment(
		`{ id email name locations { id address phoneNumber pictureURL } }`
	)
}

async function menuItems(root, args, context) {
	const userId = getUserId(context)
	const locations = await context.prisma
	.locations({
		where: {
			owner: {
				id: userId
			}
		}
	})

	return context.prisma
		.location({
			id: locations[0].id
		})
		.menuItems()
		.$fragment(
			`{ 
				id title price description price pictureURL calories 
				options { 
					id title required priority maxSelections
					optionValues { 
						id title price priority isDefault pictureURL
					} 
				} 
				categories {
					id
					name
				}
			}`
		 );
}

function locations(root, args, context) {
	const userId = getUserId(context)
	return context.prisma
	.user({
		id: userId,
	})
	.locations()
}

async function location(root, args, context) {
	const userId = getUserId(context)
	const locations = await context.prisma
	.user({
		id: userId,
	})
	.locations()
	.$fragment(`
		{id address phoneNumber email name 
		pictureURL paymentProcessorMerchantId
		paymentProcessorAccessToken
		tabletDevices{
			headerId
			paymentProcessingDevice {
				id
				deviceId
				paymentProcessor
			}
		}
		menuCategories{
			id
			name
			paymentProcessorId
		}
		taxes{
			id
			paymentProcessorId
			taxType
			taxAmount
			name
		}
	}
	
	`)
	if (locations.length > 0) {
		return locations[0]
	} else {
		throw Error("No locations exist for that user id")
	}
}

function ordersByLocationAndStatus(root, args, context) {
	getUserId(context)
	return context.prisma
	.location({
		id: args.locationId
	})
	.orders({
		where: {
			status: args.status
		}
	})
	.$fragment(
		`{ id status createdAt options { title } }`
	 );
}

function transactionsByDate(root, args, context) {
	getUserId(context)
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
}

function menuItemsByCategory(root, args, context) {
	getUserId(context)
	return context.prisma
	.menuCategory({
		id: args.menuCategoryId
	})
	.menuItems()
	.$fragment(
		`{ id price title options { title required priority } }`
	 );
}

function optionsByMenuItem(root, args, context) {
	getUserId(context)
	return context.prisma
	.menuItem({
		id: args.menuItemId
	})
	.options({
		orderBy: args.OptionOrderByInput
	})
	.$fragment(
		`{ id title maxSelections required priority optionValues { title price isDefault priority } }`
	 );
}


module.exports = {
  menuItem,
  menuItems,
	locations,
	ordersByLocationAndStatus,
	transactionsByDate,
	menuItemsByCategory,
	optionsByMenuItem,
	user,
	location
}