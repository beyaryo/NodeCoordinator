/**
 * Configuration file for raspi
 * as coordinator
 */
var SerialPort = require('serialport'),
	xbee_api = require('xbee-api')
	server = require('./server')
	client = require('./client')

// environment condition
// 1 = Good
// 0 = Bad
var tempEnvCond = 1, envCond = 1

// xbee constant	
var C = xbee_api.constants

// set xbee api to use mode 2
var xbeeAPI = new xbee_api.XBeeAPI({ api_mode: 2 })

// xbee dongle initialization
var serialport = new SerialPort("/dev/ttyUSB0", {
	baudRate: 115200,
	parser: xbeeAPI.rawParser()
})

// Combine serialport and xbee-api
serialport.pipe(xbeeAPI.parser)
xbeeAPI.builder.pipe(serialport)

// when serialport open
serialport.on("open", () => {
    serialport.write("1#ed01;")
})

// when serial port error
serialport.on("error", (error) => {
    printDash()
    print(`Serial port ${error}`)
})

// All frames parsed by the XBee will be emitted here
xbeeAPI.parser.on("data", (frame) => {
	if(frame.type == C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST){  		
		var value = (frame.data.toString('utf8'))
		
		// Split frame to receive sensor value
		var tempVal = getValue(value[4]),
			humVal = getValue(value[5]),
			coVal = getValue(value[6]),
			co2Val = getValue(value[7]),
			batVal = getValue(value[8]),
			fuzzyVal = getValue(value[9])
		
		printDash()
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
			buzz(3, 300);
			tempEnvCond = 1;
		}else if(parseInt(fuzzyVal) > 63){
			buzz(7, 300);
			tempEnvCond = 0;
		}else{
			tempEnvCond = 1;
		}

		checkEnvCond();

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
		client.emit("gateway_data", {data});

		// Emit sensor value to connected client in same network
		server.emit("sensor_value", {data});	
	}
})

function getValue(val){
    return (val.split(":"))[1];
}

function checkEnvCond(){
    if(tempEnvCond != envCond){

        if(tempEnvCond == 0){
            openLock("0000", 3);
        }else{
            openLock("0000", 2);
        }

        envCond = tempEnvCond;
    }
}
