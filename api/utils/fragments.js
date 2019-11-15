const LOGIN = `
{ id email name password
	locations {
		id address phoneNumber pictureURL
		cloverMetaData {
			merchantId
			accessToken
		}
	}
}`

const USER = `
{ 
	id email name locations 
	{ id address phoneNumber pictureURL } 
}`

const MENU_ITEMS = `
{ 
	id title price description price pictureURL calories 
	paymentProcessorId
	options { 
		id title required priority maxSelections
		optionValues { 
			id title price priority isDefault pictureURL paymentProcessorId
		} 
	} 
	categories {
		id
		name
	}
	menuItemToUpsell {
		id title price description price pictureURL calories
		paymentProcessorId
		options { 
			id title required priority maxSelections
			optionValues { 
				id title price priority isDefault pictureURL paymentProcessorId
			} 
		} 
		categories {
			id
			name
		}
		preferences
	}
	preferences
}`

const LOCATION = `
{
	id address phoneNumber 
	email name pictureURL 
	cloverMetaData{
		merchantId
		accessToken 
	}
	tabletDevices{
		id
		headerId
		cloverPaymentDeviceId
		kitchenPrinter {
			id
			type
			ipAddress
		}
		receiptPrinter {
			id
			type
			ipAddress
		}
	}
	menuCategories{
		id
		name
		paymentProcessorId
	}
	taxes{
		id
		paymentProcessorId
		taxType
		taxAmount
		name
	}
}`

const TABLET_DEVICE = `
{
	id
	headerId
	cloverPaymentDeviceId
	kitchenPrinter {
		id
		type
		ipAddress
	}
}`

const ORDER = `{
	id status createdAt
	location {
		id
		name
	}
	orderedItems {
		menuItem {
			id title price
		}
		optionValues {
			title price
		}
		quantity
		isUpsoldItem
	}
}`

module.exports = {
	LOGIN,
	USER,
	MENU_ITEMS,
	LOCATION,
	TABLET_DEVICE,
	ORDER
}