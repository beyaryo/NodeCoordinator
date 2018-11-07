var Gpio = require('onoff').Gpio

// using gpio 17 (pin 11) for buzzer
var buzzer = new Gpio(17, 'out')

module.exports = () => {
	printDash = () => {
		print("\n===========================================\n")
	}
	
	print = (message) => {
		console.log(message)
	}
	
	buzz = (loop, duration) => {
		if(loop <= 0) return
		
		buzzer.writeSync(1)
		
        setTimeout(() => {
            buzzer.writeSync(0)
            
            setTimeout(() => {
                buzz(loop-1, duration)
            }, 100)
        }, duration)
	}
}
