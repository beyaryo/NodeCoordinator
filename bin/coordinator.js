/**
 * Configuration file for raspi
 * as coordinator
 */
var SerialPort = require('serialport'),
	xbee_api = require('xbee-api')
	server = require('./server')
	client = require('./client')

var allPairedAps = {}

// environment condition
// 2 = Danger
// 1 = Warning
// 0 = Good
var tempEnvCond = 0, envCond = 0

// xbee constant	
var C = xbee_api.constants

// set xbee api to use mode 2
var xbeeAPI = new xbee_api.XBeeAPI({ api_mode: 2 })

// xbee dongle initialization
var serialport = new SerialPort("/dev/ttyUSB0", {
	baudRate: 115200
})

// Combine serialport and xbee-api
serialport.pipe(xbeeAPI.parser)
xbeeAPI.builder.pipe(serialport)

// when serialport open
serialport.on("open", () => {
	printDash()
	print(`Serial port open`)
	sendSerial("0", "ad891su7")
	buzz(3, 250)
})

// when serialport error
serialport.on("error", (error) => {
    printDash()
    print(`Serial port ${error}`)
})

// when serialport got response from action points
serialport.on('data', (data) => {
	var arr = `${data}`.substring(0, 13).split("#")

	if(arr.length > 0 && arr[0] == "9999"){
		allPairedAps.forEach(ap => {
			if(arr[1] == ap.code) ap.active = true
		})
	}else if(arr.length > 0 && arr[0] == "0890"){
		printDash()
		print(`${arr[1]} is on`)

		var ap = {
			code: arr[1],
			active: true
		}

		var apArr = []
		apArr.push(ap)

		client.emit("ap_condition", apArr)
	}
})

// All frames parsed by the XBee will be emitted here
xbeeAPI.parser.on("data", (frame) => {
	printDash()
	
	var date = new Date()
	var dateInString = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`
	print(`Data received at ${dateInString}`)

	if(frame.type == C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST){  	
		var value = (frame.data.toString('utf8')).split("#")
		
		// Split frame to receive sensor value
		var id = value[2],
			tempVal = getValue(value[4]),
			// humVal = getValue(value[5]) - randomInt(35, 45),
			// coVal = getValue(value[6]) - randomInt(0, 10),
			// co2Val = getValue(value[7]) + randomInt(35, 80),
			humVal = getValue(value[5]),
			coVal = getValue(value[6]),
			co2Val = getValue(value[7]),
			batVal = getValue(value[8]),
			fuzzyVal = getValue(value[9])
		
		print("Data received from waspmote.")
		print(`Node id : ${value[2]}`)
		print(`Frame seq : ${value[3]}`)
		print(`Temp : ${tempVal}`)
		print(`Hum : ${humVal}`)
		print(`CO : ${coVal}`)
		print(`CO2 : ${co2Val}`)
		print(`Bat : ${batVal}`)
		print(`Fuzzy : ${fuzzyVal}`)
		
		if(parseInt(fuzzyVal) > 40 && parseInt(fuzzyVal) <= 63){
			buzz(3, 300)
			tempEnvCond = 1
		}else if(parseInt(fuzzyVal) > 63){
			buzz(7, 300)
			tempEnvCond = 2
		}else{
			tempEnvCond = 0
		}

		checkEnvCond()

		var data = {
			ap: id,
			temp: tempVal,
			hum: humVal,
			co: coVal,
			co2: co2Val,
			bat: batVal,
			fuzzy: parseInt(fuzzyVal)
		}

		// Emit sensor value to server
		client.emit("sensor_value", data)

		// Emit sensor value to connected client in same network
		server.emit("sensor_value", data)
	}
})

/**
 * Send format x#yyyyyyyy;
 * x 		=> code {0 = open, 1 = close, 2 = force open}
 * yyyyyyyy => door code
 */
client.on('open_door', (doorCode) => {
    printDash()
	var date = new Date()
	var dateInString = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`

    print(`Open door ${doorCode}`)
	sendSerial("0", doorCode)
})

/**
 * Send format x#yyyyyyyy;
 * x 		=> code {0 = open, 1 = close, 2 = force open}
 * yyyyyyyy => door code
 */
client.on('open_valve', (valveCode) => {
    printDash()
    print(`Open valve ${valveCode}`)
	sendSerial("0", valveCode)
})

function getValue(val){
    return (val.split(":"))[1]
}

function checkEnvCond(){
    if(tempEnvCond != envCond){

        if(tempEnvCond != 0) sendSerial(tempEnvCond, "00000000")

        envCond = tempEnvCond
    }
}

function randomInt(min, max){
	return Math.floor(Math.random()*(max-min+1)+min)
}

function sendSerial(code, nodeId){
	serialport.write(`${code}#${nodeId}`)
}

/**
 * Send format x#yyyyyyyy;
 * x 		=> code {9}
 * yyyyyyyy => 00000000
 */
setInterval(() => {
	client.emit("gateway_paired_ap", (response) => {
		response = JSON.parse(response)
		allPairedAps = []

		response.data.forEach(ap => {
			var newAp = {}
			if(ap.code.substring(0, 2) != "as"){
				newAp.code = ap.code
				newAp.active = false

				allPairedAps.push(newAp)
			}	
		})
		
		sendSerial("9", "00000000")

		setTimeout(() => {
			printDash()
			print(`Send Ap Condition`)
			client.emit("ap_condition", allPairedAps)
		}, ((1000 * 5 * 1 * 1)))
	})
}, (1000 * 60 * 3 * 1))
