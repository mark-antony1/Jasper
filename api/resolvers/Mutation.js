const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const clover = require ("remote-pay-cloud");
const { 
	getUserId, 
	processUpload, 
	createCloverWebsocketConfiguration, 
	createCloverDeviceConnectionConfiguration,
	setCloverConnector,
	buildCloverConnectionListener,
	setCloverConnectorListener
} = require('../utils')

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
		options: {
			connect: args.options.map((val) => { return {id: val} })
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

var defaultCloverConnectorListener = Object.assign({}, clover.remotepay.ICloverConnectorListener.prototype, {

	onDeviceReady: function (merchantInfo) {
			updateStatus("Pairing successfully completed, your Clover device is ready to process requests.");
			console.log({message: "Device Ready to process requests!", merchantInfo: merchantInfo});
	},

	onDeviceDisconnected: function () {
			console.log({message: "Disconnected"});
	},

	onDeviceConnected: function () {
			console.log({message: "Connected, but not available to process requests"});
	}

});

function configureConnection(devices, user) {
	const cloverWebsocketConfiguration = createCloverWebsocketConfiguration(user, devices)
	const cloverDeviceConnectionConfiguration = createCloverDeviceConnectionConfiguration(cloverWebsocketConfiguration)
	let builderConfiguration = {};
	builderConfiguration[clover.CloverConnectorFactoryBuilder.FACTORY_VERSION] = clover.CloverConnectorFactoryBuilder.VERSION_12;
	let cloverConnectorFactory = clover.CloverConnectorFactoryBuilder.createICloverConnectorFactory(builderConfiguration);
	let cloverConnector = cloverConnectorFactory.createICloverConnector(cloverDeviceConnectionConfiguration);
	setCloverConnector(cloverConnector)
	let exampleConnectorListener = buildCloverConnectionListener(cloverWebsocketConfiguration);
	cloverConnector.addCloverConnectorListener(defaultCloverConnectorListener)
	// setCloverConnectorListener(exampleConnectorListener)
	cloverConnector.initializeConnection();

	// cloverConnector.showWelcomeScreen();

	return '$$ Payment Complete ' + devices[0].paymentProcessingDevice.deviceId;
}

async function purchase(root, args, context) {
	const userId = getUserId(context)
	const tabletDeviceHeaderId = context.request.get('UniqueHeader')

	const user = await context.prisma.user({
		id: userId,
	})

	const devices = await context.prisma.user({
		id: userId,
	})
	.tabletDevices({
		where: {
			headerId: tabletDeviceHeaderId
		}
	})
	.paymentProcessingDevice()

	const msg = await configureConnection(devices, user)
	return msg
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
	purchase
}