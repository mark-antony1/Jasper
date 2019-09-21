const uuid = require('uuid/v1')
const aws = require('aws-sdk')
const jwt = require('jsonwebtoken')
const clover = require("remote-pay-cloud")
const XMLHttpRequest = require("xmlhttprequest-ssl").XMLHttpRequest;
const WebSocket = require('ws');
const DefaultConnectionListener = require("./DefaultConnectionListener");

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

function createWebSocket(config) {
    return {
        get: function (endpoint) {
            let webSocketOverrides = {
                createWebSocket: function (endpoint) {
                    // To support self-signed certificates you must pass rejectUnauthorized = false.
                    // https://github.com/websockets/ws/blob/master/examples/ssl.js
                    let sslOptions = {
                        rejectUnauthorized: false
                    };
                    // Use the ws library by default.
                    return new WebSocket(endpoint, sslOptions);
                }
            }
            return Object.assign(new clover.CloverWebSocketInterface(endpoint), webSocketOverrides);
        }
    }
}

function createCloverDeviceConnectionConfiguration (connectionConfiguration) {
  let configBuilder =  new clover.WebSocketCloudCloverDeviceConfigurationBuilder(
    connectionConfiguration.remoteApplicationId,
    connectionConfiguration.deviceId,
    connectionConfiguration.merchantId,
    connectionConfiguration.accessToken
  );
  configBuilder.setCloverServer(connectionConfiguration.cloverServer);
  configBuilder.setFriendlyId(connectionConfiguration.friendlyId);
  configBuilder.setHttpSupport(connectionConfiguration.httpSupport);
  configBuilder.setWebSocketFactoryFunction(connectionConfiguration.webSocketFactoryFunction);
  return configBuilder.build();
}

function createCloverWebsocketConfiguration(user, devices, tabletId){
  return Object.assign({}, {
    "accessToken": user.paymentProcessorAccessToken, // accessToken
    "cloverServer": "https://sandbox.dev.clover.com/",
    "httpSupport": new clover.HttpSupport(XMLHttpRequest),
    "merchantId": user.paymentProcessorMerchantId,
    "deviceId": devices[0].paymentProcessingDevice.deviceId,
    "friendlyId": 'demo clover',
    "remoteApplicationId": process.env.RAID,
    "webSocketFactoryFunction": createWebSocket().get,
    "tabletId": tabletId
  });
}

let gCloverConnectorMap = {} 
let gCloverConnectorListenerMap =  {}

function setCloverConnector (cloverConnectorIn, tabletId) {
  gCloverConnectorMap[tabletId] = cloverConnectorIn;
};

function setCloverConnectorListener (cloverConnectorListenerIn, tabletId) {
  gCloverConnectorListenerMap[tabletId] = cloverConnectorListenerIn;
};

function getCloverConnector (tabletId) {
  return gCloverConnectorMap[tabletId]
};


var buildCloverConnectionListener = function (answers) {
  let defaultConnectorListener = DefaultConnectionListener.create(gCloverConnector);
  return Object.assign(defaultConnectorListener, {
      onDeviceReady: function (merchantInfo) {
          cloverConnector.resetDevice();
          executeAction(answers);
      }
  });
};

var executeAction = function (answers) {
  // Connected and available to process requests
  const executor = executors[`${answers.action}Executor`];
  if (executor) {
      executor.create(cloverConnector, cloverConnectorListener).run();
  } else {
      const otherActions = {
          "ShowWelcomeScreen": () => {
              cloverConnector.showWelcomeScreen();
              showMenu();
          },
          "ShowThankYouScreen": () => {
              cloverConnector.showThankYouScreen();
              showMenu();
          },
          "DisplayMessage": () => {
              inquirer.prompt(Prompts.message).then((answers) => {
                  cloverConnector.showMessage(answers.message);
                  showMenu();
              });
          },
          "ResetDevice": () => {
              cloverConnector.resetDevice();
              showMenu();
          },
          "Print": () => {
              inquirer.prompt(Prompts.print).then((answers) => {
                  const printRequest = new clover.remotepay.PrintRequest();
                  printRequest.setText([answers.message]);
                  cloverConnector.print(printRequest);
                  showMenu();
              });
          },
          "Exit": () => disposeAndExit(cloverConnector)

      };
      otherActions[answers.action]();
  }
};

module.exports = {
	getUserId,
  processUpload,
  createWebSocket,
  createCloverWebsocketConfiguration,
  createCloverDeviceConnectionConfiguration,
  setCloverConnector,
  buildCloverConnectionListener,
  setCloverConnectorListener,
  getCloverConnector
}