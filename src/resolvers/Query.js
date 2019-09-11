const { getUserId } = require('../utils')


function menuItem(root, args, context) {
	getUserId(context)
	return context.prisma
	.menuItem({ id: args.menuItemId })
}

function menuItems(root, args, context) {
	const userId = getUserId(context)
	return context.prisma
		.user({
			id: userId,
		})
		.menuItems()
}

function locations(root, args, context) {
	const userId = getUserId(context)
	return context.prisma
	.user({
		id: userId,
	})
	.locations()
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
	optionsByMenuItem
}