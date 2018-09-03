const Gpio = require('pigpio').Gpio;
const speedWire = new Gpio(18, { mode: Gpio.OUTPUT });
const speedInfoWire = new Gpio(25, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN });
const inclineWire = new Gpio(19, { mode: Gpio.OUTPUT });
const declineWire = new Gpio(26, { mode: Gpio.OUTPUT });

// TODO if program is CTRL + C'd or crashes, it needs to go to 0!! It doesn't as of right now
const treadmill = {
    initialize: () => {
        treadmill.achieveTargetSpeedLoop();
    },
    targetSpeed: 0,
    currentSpeed: 0,
    achieveTargetSpeedLoop: () => {
        const speedWireFrequency = 20; // Treadmill uses 20Hz freq from testing.
        let currentDutyCycle = 0;

        const translateMphToDutyCycle = (mph) => {
            // Voltage this 0.36v for 1mph / 0.44v for 2mph / 1.24v for 12mph
            // Following this, increments 0.073v per 1mph
            // At 20Hz, 68000 hardwarePwmWrite gets ~0.364v which is close to 1mph
            // At 20Hz, 83000 hardwarePwmWrite gets ~0.438v which is close to 2mph
            // Following this, increments of 1mph = 15000 duty cycle.
            const dutyCycleFloor = 53000; // Technically "0mph" following above logic.
            const mphToDutyCycleMultiplier = 15000; // Increments of 1mph = 15000 duty cycle.
            const lowestDutyCycle = 60000; // Treadmill's lowest speed was 0.5mph so cap it off here just to be safe.
            
            let dutyCycleForMph = (mphToDutyCycleMultiplier * mph) + dutyCycleFloor;

            if (dutyCycleForMph <= lowestDutyCycle) {
                return 0; // If we're asked to get the duty cycle for anything below 0.5mph, just return 0.
            } 
        };

        setInterval(() => {
            // Going from 0mph to 6mph takes roughly 11s
            // https://photos.app.goo.gl/h2WShMgJdqL9JZsq5
            // Therefor, for every 1mph, it takes 0.55s
            let speedChange;
            if (treadmill.targetSpeed > treadmill.currentSpeed) {
                speedChange = 0.1;
            } else if (treadmill.targetSpeed < treadmill.currentSpeed) {
                speedChange = -0.1;
            }

            const nextSpeedMph = treadmill.currentSpeed + speedChange;

            // TODO: temporary safety check Cap speed at 4mph
            if (nextSpeedMph < 4) {
                const newDutyCycle = translateMphToDutyCycle(nextSpeedMph);
                speedWire.hardwarePwmWrite(speedWireFrequency, currentDutyCycle);
            }

            // Once target speed is acquired, destroy the interval.
            // if (currentDutyCycle >= targetDutyCycle) {
            //     clearInterval(speedInterval);
            // }
        }, 200);
    },
    goToSpeed: (mph) => {
        if (mph < 4) { // TODO: temporary safety check
            treadmill.targetSpeed = mph;
        }
    },
    speedWireOn: (targetDutyCycle) => {
    },
    speedWireOff: () => {
        // speedWire.digitalWrite(0);
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

treadmill.initialize();

module.exports = treadmill;
