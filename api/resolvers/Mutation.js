const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const request = require("request-promise")
const { 
	syncInventory,
	syncTaxes,
	getOldLineItems,
	voidManualLineItems,
	addLineItems,
	getAccessToken
} = require('../utils/cloverUtils')
const { 
	getUserId, 
	processUpload, 
	getLocationsByUserId
} = require('../utils/utils')

require('dotenv').config()

function createMenuItem(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.createMenuItem({
		price: args.price,
		title: args.title,
		pictureURL: args.pictureURL,
		description: args.description,
		calories: args.calories,
		author: {
			connect: {
				id: userId,
			}
		},
		categories: {
			connect: [{
				id: args.categoryId
			}]
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

function createKitchenPrinter(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.createKitchenPrinter({
		type: args.type,
		ipAddress: args.ipAddress
	})
}

function createOption(root, args, context) {
	getUserId(context)
	return context.prisma.createOption({
		title: args.title,
		maxSelections: args.maxSelections,
		required: args.required,
		priority: args.priority,
		menuItems: {
			connect: [{
				id: args.menuItemId,
			}]
		}
	})
}


function createOptionValue(root, args, context) {
	getUserId(context)
	return context.prisma.createOptionValue({
		title: args.title,
		priority: args.priority,
		price: args.price,
		isDefault: args.isDefault,
		option: {
			connect: {
				id: args.optionId,
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

function updateMenuItem(root, args, context) {
	getUserId(context)
	return context.prisma.updateMenuItem({
		where: { id: args.menuItemId },
		data: { 
			description: args.description,
			title: args.title,
			pictureURL: args.url,
			price: args.price,
			menuItemToUpsell: {
				connect: {
					id: args.menuItemToUpsell
				}
			}
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

function updateOption(root, args, context) {
	getUserId(context)
	return context.prisma.updateOption({
		where: { id: args.optionId },
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

async function syncLocation(root, args, context){
	const locations = await getLocationsByUserId(context)
	let { paymentProcessorMerchantId , paymentProcessorAccessToken, id} =  locations[0]

	const inventoryOptions = {
		method: 'GET',
		url: process.env.CLOVER_API_BASE_URL + paymentProcessorMerchantId + '/items',
		qs: {access_token: paymentProcessorAccessToken, expand: 'modifierGroups'}
	};
	
	const taxOptions =  {
		method: 'GET',
		url: process.env.CLOVER_API_BASE_URL + paymentProcessorMerchantId +  '/tax_rates',
		qs: {access_token: paymentProcessorAccessToken},
		headers: {accept: 'application/json'}
	};

	const modifierGroupOptions = {
    method: 'GET',
    url: process.env.CLOVER_API_BASE_URL + paymentProcessorMerchantId + '/modifier_groups',
    qs: {expand: 'modifiers', access_token: paymentProcessorAccessToken},
  };

	return Promise.all([
		syncInventory(inventoryOptions, modifierGroupOptions, context, id),
		syncTaxes(taxOptions, context, id)
	])
}

async function updateOrder(root, args, context){
	const locations = await getLocationsByUserId(context)
	let { paymentProcessorMerchantId , paymentProcessorAccessToken} =  locations[0]
	
	const oldLineItems = await getOldLineItems(args.orderId, paymentProcessorAccessToken, paymentProcessorMerchantId)

	return Promise.all([
		voidManualLineItems(oldLineItems, args.orderId, paymentProcessorAccessToken, paymentProcessorMerchantId),
		addLineItems(args, paymentProcessorAccessToken, paymentProcessorMerchantId)
	])
}

function updateMenuItemPreferences(root, args, context) {
	const userId = getUserId(context)
	return context.prisma.updateMenuItem({
		where: { id: args.menuItemId },
		data: {
			preferences: { set: args.preferences}
		}
	})
}

async function addAccessTokenToLocation(root, args, context){
	const { code, merchantId } = args
	
	const userId = getUserId(context)
	const locations = await context.prisma
	.user({
		id: userId,
	})
	.locations()
	const locationId = locations[0].id

	const token = await getAccessToken(code)

	return context.prisma.updateLocation({
		where: { id: locationId },
		data: {
			merchantId: merchantId,
			accessToken: token
		}
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
	.$fragment(`
		{ id email name password
			locations { 
				id address phoneNumber pictureURL 
				cloverMetaData {
					merchantId
					accessToken
				}
			} 
		}
	`)
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
	createOption,
	createTransaction,
	createMenuItem,
	updateMenuItem,
	createLocation,
	uploadMenuItemPicture,
	createMenuCategory,
	updateMenuCategory,
	updateOption,
	createOptionValue,
	syncLocation,
	createKitchenPrinter,
	addAccessTokenToLocation,
	updateMenuItemPreferences
}