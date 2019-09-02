const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getUserId, processUpload } = require('../utils')
require('dotenv').config()

function createMenuItem(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.createMenuItem({
		price: args.price,
		title: args.title,
		pictureURL: args.pictureURL,
		author: {
			connect: {
				id: userId,
			}
		},
		category: {
			connect: {
				id: args.categoryId
			}
		}
	})
}

function createMenuCategory(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.createMenuCategory({
		name: args.name,
		owner: {
			connect: {
				id: userId
			}
		}
	})
}

function createIngredient(root, args, context) {
	getUserId(context)
	return context.prisma.createIngredient({
		name: args.name,
		status: args.status,
		price: args.price,
		menuItem: {
			connect: {
				id: args.menuItemId,
			}
		}
	})
}

function createTransaction(root, args, context) {
	getUserId(context)
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
}

function createOrder(root, args, context) {
	getUserId(context)
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
}

function createLocation(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.createLocation({
		address: args.address,
		phoneNumber: args.phoneNumber,
		email: args.email,
		owner: {
			connect: {
				id: userId,
			}
		}
	})
}

function updateUser(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.updateUser({
		where: { id: userId },
		data: { 
			password: args.password,
			email: args.email,
			name: args.name
		}
	})
}

function updateOrder(root, args, context) {
	getUserId(context)
	return context.prisma.updateOrder({
		where: { id: args.orderId },
		data: { status: args.status }
	})
}

function updateMenuItem(root, args, context) {
	getUserId(context)
	return context.prisma.updateMenuItem({
		where: { id: args.menuItemId },
		data: { 
			title: args.title,
			pictureURL: args.url,
			price: args.price
		}
	})
}

function updateMenuCategory(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.updateMenuCategory({
		where: { owner: userId},
		data: {
			name: args.string
		}
	})
}

function updateIngredient(root, args, context) {
	getUserId(context)
	return context.prisma.updateIngredient({
		where: { id: args.ingredientId },
		data: {
			name: args.string,
			status: args.status,
			price: args.price
		}
	})
}

function updateLocation(root, args, context) {
	getUserId(context)
	return context.prisma.updateLocation({
		where: { id: args.locationId },
		data: { 
			address: args.address,
			email: args.email,
			phoneNumber: args.phoneNumber
		}
	})
}

function deleteUser(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.deleteUser({
		id: userId
	})
}

function deleteOrder(root, args, context) {
	getUserId(context)
	return context.prisma.deleteOrder({
		id: args.orderId
	})
}

function deleteLocation(root, args, context) {
	getUserId(context)
	return context.prisma.deleteLocation({
		id: args.locationId
	})
}

function deleteMenuItem(root, args, context) {
	getUserId(context)
	return context.prisma.deleteMenuItem({
		id: args.menuItemId
	})
}

async function uploadMenuItemPicture(root, args, ctx, info) {
	return await processUpload(await args, ctx)
}

async function signup(parent, args, context, info) {
  // 1
  const password = await bcrypt.hash(args.password, 10)
  // 2
  const user = await context.prisma.createUser({ ...args, password })

  // 3
  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  // 4
  return {
    token,
    user,
  }
}

async function login(parent, args, context, info) {
  // 1
  const user = await context.prisma.user({ email: args.email })
  if (!user) {
    throw new Error('No such user found')
  }

  // 2
  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  // 3
  return {
    token,
    user,
  }
}

module.exports = {
  signup,
  login,
	deleteMenuItem,
	deleteLocation,
	deleteOrder,
	deleteUser,
	updateLocation,
	updateUser,
	updateOrder,
	createOrder,
	createIngredient,
	createTransaction,
	createMenuItem,
	updateMenuItem,
	createLocation,
	uploadMenuItemPicture,
	createMenuCategory,
	updateMenuCategory,
	updateIngredient
}