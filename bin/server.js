/**
 * Configuration file for raspi
 * as server
 */
var express = require('express'),
	socketIO = require('socket.io'),
    parser = require('body-parser'),
    app = express()
    require('./utils.js')()
    
// counter of connected client
var connectedClient = 0

// common config
app.use(parser.urlencoded({ extended: false }))
app.use(parser.json())
app.use(express.static(__dirname + '/public'))

// start server...
var server = app.listen( process.env.PORT || 18392, () => {
    print(`Server listening on port ${server.address().port}`)
});

// listening socket
var io = socketIO.listen(server)

// listen when some device make a connection
io.on('connection', (socket) => {
    connectedClient++
    printDash()
    
    print("An android client connected !")
    print(`Total connected device : ${connectedClient}`)
    
    handle(socket)
});

// handle all socket event
function handle(socket){
	
	socket.on('disconnect', () => {
		connectedClient--
		printDash()	
    
		print("An android client disconnected !")
		print(`Total connected device : ${connectedClient}`)
	})
	
}

module.exports = io
