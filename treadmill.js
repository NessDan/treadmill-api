const Gpio = require('pigpio').Gpio;
const speedWire = new Gpio(18, { mode: Gpio.OUTPUT });
const speedInfoWire = new Gpio(25, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN });
const inclineWire = new Gpio(19, { mode: Gpio.OUTPUT });
const declineWire = new Gpio(26, { mode: Gpio.OUTPUT });

const treadmill = {
    speedWireOn: (targetDutyCycle) => {
        let currentDutyCycle = 0;
        const speedInterval = setInterval(() => {
            speedWire.hardwarePwmWrite(21, 500000);
            currentDutyCycle+=1;

            if (currentDutyCycle >= targetDutyCycle) {
                clearInterval(speedInterval);
            }
        }, 700);
    },
    speedWireOff: () => {
        speedWire.digitalWrite(0);
    },
    inclineWireOn: () => {
        console.log(`Flipping the incline wire on`);
        inclineWire.digitalWrite(1);
    },
    inclineWireOff: () => {
        console.log(`Flipping the incline wire off`);
        inclineWire.digitalWrite(0);
    },
    declineWireOn: () => {
        console.log(`Flipping the decline wire on`);
        declineWire.digitalWrite(1);
    },
    declineWireOff: () => {
        console.log(`Flipping the decline wire off`);
        declineWire.digitalWrite(0);
    },
    constants: {
        // All numbers at 1/10 (so a "1" is really ".1")
        speedStep: 1,
        inclineStep: 5,
    }
};

module.exports = treadmill;
