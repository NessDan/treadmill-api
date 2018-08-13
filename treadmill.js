const Gpio = require('pigpio').Gpio;
const speedWire = new Gpio(13, { mode: Gpio.OUTPUT });

const treadmill = {
    start: (req, res) => {
        const logMessage = `Starting Treadmill`;
        console.log(logMessage);
        console.log(req.query);
        let dutyCycle = 10;
        let goingUp = true;
        setInterval(() => {
            speedWire.pwmWrite(dutyCycle);
            if(goingUp) {
                dutyCycle+=1;
            } else {
                dutyCycle-=1;
            }
            if(dutyCycle > 30) {
                goingUp=false;
            } else if (dutyCycle < 10) {
                goingUp=true;
            }
        }, 700);
        res.send(logMessage);
    },
    stop: (req, res) => {
        const logMessage = `Stopping Treadmill`;
        console.log(logMessage);
        const speedWire = new Gpio(4, { mode: Gpio.OUTPUT });
        speedWire.digitalWrite(0);
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
        const percent = req.query.percent;
        const logMessage = `Increasing Incline by ${percent}%`;
        console.log(logMessage);
        treadmill.inclineVoltageOn();
        setTimeout(treadmill.inclineVoltageOff, percent * 1000);
        res.send(logMessage);
    },
    decreaseIncline: (req, res) => {
        const percent = req.query.percent;
        const logMessage = `Decreasing Incline by ${percent}%`;
        console.log(logMessage);
        treadmill.declineVoltageOn();
        setTimeout(treadmill.declineVoltageOff, percent * 1000);
        res.send(logMessage);
    },
    inclineVoltageOn: () => {
        console.log(`Flipping the switch on`);
    },
    inclineVoltageOff: () => {
        console.log(`Flipping the switch off`);
    },
    declineVoltageOn: () => {
        console.log(`Flipping the switch on`);
    },
    declineVoltageOff: () => {
        console.log(`Flipping the switch off`);
    },

};

//treadmill.start();
module.exports = treadmill;
