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

async function syncInventory(inventoryOptions, context, locationId) {
  let inventoryRes = await request(inventoryOptions);
  inventoryRes = JSON.parse(inventoryRes)
  return Promise.all(inventoryRes.elements.map(async function(element){
    const menuItemExists = await context.prisma.$exists.menuItem({
      paymentProcessorId: element.id
    });

    if (menuItemExists) {
      return context.prisma.updateMenuItem({
        where: {paymentProcessorId: element.id},
        data: {
          title: element.name
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

module.exports = {
	getUserId,
  processUpload,
  getLocationsByUserId,
  syncInventory,
  syncTaxes
}