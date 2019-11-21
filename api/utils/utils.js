const uuid = require('uuid/v1')
const aws = require('aws-sdk')
const jwt = require('jsonwebtoken')
const { LOCATION } = require("./fragments")
const { TIME_ZONE_DIFF } = require("./constants")

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
  .$fragment(LOCATION)
}

function getStartOfCurrentDay(location) {
  const timezone = location.timeZone
  const timeZoneDiff =  TIME_ZONE_DIFF[timezone]
  var currentTime = new Date(new Date().toISOString())
  currentTime.setHours(currentTime.getHours() - timeZoneDiff);
  return currentTime.toISOString().slice(0,10)
}

function getDateOneWeekAgo(location) {
  const timezone = location.timeZone
  const timeZoneDiff =  TIME_ZONE_DIFF[timezone]
  var currentTime = new Date(new Date().toISOString())
  currentTime.setHours(currentTime.getHours() - timeZoneDiff - 168);
  return currentTime.toISOString()
}

module.exports = {
	getUserId,
  processUpload,
  getLocationsByUserId,
  getStartOfCurrentDay,
  getDateOneWeekAgo
}