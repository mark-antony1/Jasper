const uuid = require('uuid/v1')
const aws = require('aws-sdk')
const jwt = require('jsonwebtoken')
const request = require("request-promise")

require('dotenv').config()

function getUserId(context) {
	const Authorization = context.request.get('Authorization')
  if (Authorization) {
		const token = Authorization.replace('Bearer ', '')
		const { userId } = jwt.verify(token, process.env.APP_SECRET)
    return userId
  }
  throw new Error('Not authenticated')
}


const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEYY,
  params: {
    Bucket: process.env.BUCKET_NAME
  },
  endpoint: new aws.Endpoint(process.env.AWS_ENDPOINT)
})

async function processUpload ( {file, menuItemId}, context )  {
  if (!file) {
    return console.log('ERROR: No file received.')
  }

  const { stream, filename} = await file
  const key = uuid() + '-' + filename

  const response = await s3
    .upload({
      Key: key,
      ACL: process.env.ACL,
      Body: stream
    }).promise()

  const url = response.Location

	return context.prisma.updateMenuItem({
		where: { id: menuItemId },
		data: { 
			pictureURL: url,
		}
	})

}

function getLocationsByUserId(context){
  const userId = getUserId(context)
	return context.prisma
	.locations({
		where: {
			owner: {
				id: userId
			}
		}
	})
}

async function syncInventory(inventoryOptions, modifierGroupOptions, context, locationId) {
  let inventoryRes = await request(inventoryOptions);
  inventoryRes = JSON.parse(inventoryRes)

  let modifiersGroupRes = await request(modifierGroupOptions)
  modifiersGroupRes = JSON.parse(modifiersGroupRes)

  const processorToModelMap = await syncModifierGroupsAndModifiers(modifiersGroupRes, context)

  return Promise.all(inventoryRes.elements.map(async function(element){
    const menuItemExists = await context.prisma.$exists.menuItem({
      paymentProcessorId: element.id
    });

    const hydratedItem = hydrateInventoryItem(element, modifiersGroupRes)
    if (menuItemExists) {
      return context.prisma.updateMenuItem({
        where: {paymentProcessorId: element.id},
        data: {
          title: element.name,
          options: {
            connect: element.modifierGroups.elements.map(group => {
              return { id: processorToModelMap[group.id] } 
            })
          }
        },
      })
    } else {
      return context.prisma.createMenuItem({
        title: element.name,
        paymentProcessorId: element.id,
        price: element.price,
        description: '',
        calories: 0,
        pictureURL: '',
        options: {
          connect: element.modifierGroups.elements.map(group => {
            return { id: processorToModelMap[group.id] } 
          })
        },
        location: {
          connect: {
            id: locationId
          }
        }
      })
    }
  }))
}

function getTaxData(element) {
  if(element.taxAmount === undefined){
    return {
      paymentProcessorId: element.id,
      name: element.name,
      taxAmount: element.rate,
      taxType: "PERCENT"
    }
  } else {
    return {
      paymentProcessorId: element.id,
      name: element.name,
      taxAmount: element.taxAmount,
      taxType: "FLAT"
    }
  }
}


async function syncModifierGroupsAndModifiers(modifierGroups, context) {
  var modifierGroupMap = {}

  await Promise.all(modifierGroups.elements.map(async function(modifierGroup){
    const modelModifierGroup = await context.prisma.option({
      paymentProcessorId: modifierGroup.id
    });

    if(modelModifierGroup){
      modifierGroupMap[modifierGroup.id] = modelModifierGroup.id
    } else {
      const option = await createModifiersAndModifierGroups(modifierGroup, context)
      modifierGroupMap[option.paymentProcessorId] = option.id
    }
  }))

  return modifierGroupMap
}

async function createModifiersAndModifierGroups(modifierGroup, context) {
  const createdOption = await context.prisma.createOption({
    title: modifierGroup.name,
    paymentProcessorId: modifierGroup.id,
    required: false, 
    maxSelections: 1,
    priority: 1
  })

  Promise.all(modifierGroup.modifiers.elements.map(modifier => {
    return context.prisma.createOptionValue({
      title: modifier.name,
      paymentProcessorId: modifier.id,
      price: modifier.price, 
      priority: 1,
      isDefault: false,
      option: {
        connect: {
          id: createdOption.id
        }
      }
    })
  }))

  return createdOption

}

async function syncTaxes(taxOptions, context, locationId) {
  let taxRes = await request(taxOptions);
  taxRes = JSON.parse(taxRes)
  return Promise.all(taxRes.elements.map(async function(element){
    const taxExists = await context.prisma.$exists.tax({
      paymentProcessorId: element.id
    });

    const taxData = getTaxData(element)
    if (taxExists) {
      return context.prisma.updateTax({
        where: {paymentProcessorId: element.id},
        data: taxData
      })
    } else {
      return context.prisma.createTax({
        ...taxData,
        location: {
          connect: {
            id: locationId
          }
        }
      })
    }
  }))
}

function getOldLineItems(orderId, accessToken, merchantId) {
  const getOrderLineItems = {
		method: 'GET',
		url: process.env.CLOVER_API_BASE_URL + merchantId + '/orders/' + orderId + '/line_items',
		qs: {access_token: accessToken},
  };
  
  return request(getOrderLineItems);
}

function voidManualLineItems(oldLineItems, orderId, accessToken, merchantId) {
  const deleteOptions = {
		method: 'DELETE',
		url: process.env.CLOVER_API_BASE_URL + merchantId + '/orders/' + orderId + '/line_items/',
		qs: {access_token: accessToken},
  };

  const parsedLineItems = JSON.parse(oldLineItems)
  return Promise.all(parsedLineItems.elements.map(element => {
    let curDeleteOptions = Object.assign({}, deleteOptions)
    curDeleteOptions.url += element.id
    const nonItemizedTransaction = element.name === undefined || element.name === "Manual Transaction"
    if (nonItemizedTransaction) {
      return request(curDeleteOptions)
    } 
  }))
}

async function addLineItems(args, accessToken, merchantId){
  const { orderId, lineItems } = args
  const createLineItemOptions = {
		method: 'POST',
		url: process.env.CLOVER_API_BASE_URL + merchantId + '/orders/' + orderId + '/line_items',
		qs: {access_token: accessToken},
  };

  await Promise.all(lineItems.map(async function(lineItem, index) {
    let curCreateLineItemOptions = Object.assign({}, createLineItemOptions)
    let body = {}
    body.name = lineItem.name
    body.price = lineItem.price
    body.item = {id: lineItem.itemId}
    body = JSON.stringify(body)
    curCreateLineItemOptions.body = body

    const lineItemResponse  = await request(curCreateLineItemOptions)
    lineItems[index].paymentProcessorId = JSON.parse(lineItemResponse).id
  }))

  return await applyModifications(lineItems, orderId, merchantId, accessToken)
}

async function getAccessToken(code, clientId, clientSecret) {
  const getAccessTokenOptions = {
		method: 'GET',
    url: process.env.CLOVER_BASE_URL + 'oauth/token?client_id=' + process.env.CLOVER_CLIENT_ID + 
      '&client_secret='+ process.env.CLOVER_CLIENT_SECRET + '&code=' + code,
  };
  const response = await request(getAccessTokenOptions)
  return JSON.parse(response).access_token
}


function applyModifications(lineItems, orderId, merchantId, accessToken) {
  const modificationOptions = {
		method: 'POST',
		url: process.env.CLOVER_API_BASE_URL + merchantId + '/orders/' + orderId + '/line_items/',
		qs: {access_token: accessToken},
  };

  return Promise.all(lineItems.map(lineItem => {
    return Promise.all(lineItem.modifications.map(modification => {
      let curModificationOptions = Object.assign({}, modificationOptions)
      let body = JSON.stringify({modifier: {id: modification.modificationId}})

      curModificationOptions.body = body
      curModificationOptions.url += lineItem.paymentProcessorId + '/modifications'

      return request(curModificationOptions)
    }))
  }))
}

module.exports = {
	getUserId,
  processUpload,
  getLocationsByUserId,
  syncInventory,
  syncTaxes,
  getOldLineItems,
  voidManualLineItems,
  addLineItems,
  getAccessToken
}