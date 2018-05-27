// const Gpio = require('onoff').Gpio;

const treadmill = {
    start: (req, res) => {
        const logMessage = `Starting Treadmill`;
        console.log(logMessage);
        console.log(req.query);
        res.send(logMessage);
    },    
    stop: (req, res) => {
        const logMessage = `Stopping Treadmill`;
        console.log(logMessage);
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
        const logMessage = `Increasing Incline by ${percent}`;
        console.log(logMessage);
        res.send(logMessage);
    },    
    decreaseIncline: (req, res) => {
        const percent = req.query.percent;
        const logMessage = `Decreasing Incline by ${percent}`;
        console.log(logMessage);
        res.send(logMessage);
    },
};


module.exports = treadmill;