const Gpio = require('pigpio').Gpio;
const speedWire = new Gpio(13, { mode: Gpio.OUTPUT });
const inclineWire = new Gpio(19, { mode: Gpio.OUTPUT });
const declineWire = new Gpio(26, { mode: Gpio.OUTPUT });

const treadmill = {
    start: (req, res) => {
        const logMessage = `Starting Treadmill`;
        console.log(logMessage);
        console.log(req.query);
        speedWireOn(req.query.dutyCycle);
        res.send(logMessage);
    },
    stop: (req, res) => {
        const logMessage = `Stopping Treadmill`;
        console.log(logMessage);
        treadmill.speedWireOff();
        res.send(logMessage);
    },
    setSpeed: (req, res) => {
        const mph = req.query.mph;
        const logMessage = `Setting Speed to ${mph}`;
        console.log(logMessage);
        res.send(logMessage);
    },
    setIncline: (req, res) => {
        const percent = req.query.percent;
        const logMessage = `Setting Incline to ${percent}`;
        console.log(logMessage);
        res.send(logMessage);
    },
    increaseSpeed: (req, res) => {
        const mph = req.query.mph;
        const logMessage = `Increasing Speed by ${mph}`;
        console.log(logMessage);
        res.send(logMessage);
    },
    decreaseSpeed: (req, res) => {
        const mph = req.query.mph;
        const logMessage = `Decreasing Speed by ${mph}`;
        console.log(logMessage);
        res.send(logMessage);
    },
    increaseIncline: (req, res) => {
        let percent = 1;

        if (req && req.query && req.query.percent) {
            percent = req.query.percent;
        }

        const logMessage = `Increasing Incline by ${percent}%`;
        console.log(logMessage);
        treadmill.inclineWireOn();
        setTimeout(treadmill.inclineWireOff, percent * 5000);
        res.send(logMessage);
    },
    decreaseIncline: (req, res) => {
        let percent = 1;

        if (req && req.query && req.query.percent) {
            percent = req.query.percent;
        }

        const logMessage = `Decreasing Incline by ${percent}%`;
        console.log(logMessage);
        treadmill.declineWireOn();
        setTimeout(treadmill.declineWireOff, percent * 5000);
        res.send(logMessage);
    },
    speedWireOn: (targetDutyCycle) => {
        let currentDutyCycle = 0;
        const speedInterval = setInterval(() => {
            speedWire.pwmWrite(currentDutyCycle);
            currentDutyCycle+=1;

            if (currentDutyCycle >= targetDutyCycle) {
                clearInterval(speedInterval);
            }
        }, 700);
    },
    speedWireOff: () => {
        speedWire.pwmWrite(0);
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

};

module.exports = treadmill;
