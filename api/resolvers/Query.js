const { getUserId } = require('../utils/utils')
const { USER, MENU_ITEMS, LOCATION, TABLET_DEVICE } = require('../utils/fragments')


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
	const userId = getUserId(context)
	return context.prisma
	.user({
		id: userId,
	})
	.$fragment(USER)
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
		.$fragment(MENU_ITEMS);
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
	.$fragment(LOCATION)

	if (locations.length > 0) {
		return locations[0]
	} else {
		throw Error("No locations exist for that user id")
	}
}

function tabletDevice(root, args, context) {
	const userId = getUserId(context)
	return context.prisma
	.tabletDevice({
		id: args.tabletDeviceId,
	})
	.$fragment(TABLET_DEVICE)
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
	location,
	tabletDevice
}