const Gpio = require('pigpio').Gpio;

const treadmill = {
    start: (req, res) => {
        const logMessage = `Starting Treadmill`;
        console.log(logMessage);
        //console.log(req.query);
const wire = new Gpio(4, {mode: Gpio.OUTPUT});
//wire.digitalWrite(1);
let dutyCycle = 5;
let goingUp = true;
wire.pwmWrite(100);
/*
setInterval(() => {
wire.pwmWrite(dutyCycle);
if(goingUp) {
dutyCycle+=5;
} else {
dutyCycle-=5;
}
if(dutyCycle > 250) {
goingUp=false;
} else if (dutyCycle === 5) {
goingUp=true;
}
}, 100);
*/
        //res.send(logMessage);
    },    
    stop: (req, res) => {
        const logMessage = `Stopping Treadmill`;
        console.log(logMessage);
const wire = new Gpio(4, {mode: Gpio.OUTPUT});
wire.digitalWrite(0);
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
