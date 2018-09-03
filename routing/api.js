const express = require('express');
const treadmill = require('../treadmill.js');
const apiRouter = express.Router();

// All of these functions can be hit by visiting /api/functionName
const routing = {
    start: (req, res) => {
        const logMessage = `Starting Treadmill`;
        console.log(logMessage);
        console.log(req.query);
        treadmill.speedWireOn(req.query.dutyCycle);
        res.send(logMessage);
    },
    stop: (req, res) => {
        const logMessage = `Stopping Treadmill`;
        console.log(logMessage);
        treadmill.speedWireOff();
        res.send(logMessage);
    },
    incline: (req, res) => {
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
    decline: (req, res) => {
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
    faster: (req, res) => {
        const logMessage = `Increasing Speed by ${treadmill.constants.speedStep}`;
        console.log(logMessage);
        res.send(logMessage);
    },
    slower: (req, res) => {
        const mph = req.query.mph;
        const logMessage = `Decreasing Speed by ${treadmill.constants.speedStep}`;
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
};

// Go through each property on our routing object and link it
// to an API endpoint URL.
Object.keys(routing).forEach(endpointName => {
    apiRouter.post(`/${endpointName}`, routing[endpointName]);
});

module.exports = apiRouter;
