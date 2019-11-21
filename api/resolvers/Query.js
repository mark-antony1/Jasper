const { getUserId } = require('../utils/utils')
const { USER, MENU_ITEMS, LOCATION, TABLET_DEVICE, ORDER_LOG } = require('../utils/fragments')
const { getStartOfCurrentDay, getDateOneWeekAgo } = require('../utils/utils')

async function menuItem(root, args, context) {
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

async function orderLogsFromToday(root, args, context) {
	const userId = getUserId(context)
	const locations = await context.prisma
	.user({
		id: userId,
	})
	.locations()

	if (locations.length > 0) {
		let location = locations[0]
		const startOfCurrentDay = getStartOfCurrentDay(location)
		return context.prisma.location({
			id: location.id
		})
		.orderLogs({
			where : { createdAt_gte: startOfCurrentDay }
		})
		.$fragment(ORDER_LOG)

	} else {
		throw Error("No locations exist for that user id")
	}
}

async function orderLogsFromPastWeek(root, args, context) {
	const userId = getUserId(context)
	const locations = await context.prisma
	.user({
		id: userId,
	})
	.locations()

	if (locations.length > 0) {
		let location = locations[0]
		const startOfCurrentDay = getDateOneWeekAgo(location)
		return context.prisma.location({
			id: location.id
		})
		.orderLogs({
			where : { createdAt_gte: startOfCurrentDay }
		})
		.$fragment(ORDER_LOG)
		
	} else {
		throw Error("No locations exist for that user id")
	}
}


module.exports = {
  menuItem,
  menuItems,
	locations,
	ordersByLocationAndStatus,
	menuItemsByCategory,
	optionsByMenuItem,
	user,
	location,
	tabletDevice,
	orderLogsFromToday,
	orderLogsFromPastWeek
}