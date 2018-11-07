/**
 * Configuration file for raspi
 * as client
 */
var socketIO = require('socket.io-client'),
	wifi = require('node-wifi')
    require('./utils.js')()
    
// gateway client id
// this id is registered on server database
var id = "gw01"

// start wifi state reader service
wifi.init()

// Connect to socket server
var socket = socketIO.connect("http://192.168.0.20:3000")
//var socket = socketIO.connect("https://uho.herokuapp.com")

// listen when socket make connection with server
socket.on('connect', () => {
	printDash()
	print("Gateway connected")
	joinRoom()
})

// listen when socket disconnected form server
socket.on('disconnect', () => {
	printDash()
	print("Gateway disconnected")
})

// create a room on server
// each gateway has different room based on gateway id
function joinRoom(){
    var wpa_cli = require('wireless-tools/wpa_cli')
    
    wpa_cli.status('wlan0', (err, status) => {
        var ip = status["ip"];
        var bssid = status["bssid"];

        wifi.getCurrentConnections((err, network) => {
            if(!err){
                print(`Gateway join room ${id}`)
                socket.emit("gateway_join", id, ip, bssid)
            }else{
				print(`Error getCurrentConnections ${err.message}`)
			}
        })
    })
}

module.exports = socket
