const express = require('express');
const treadmill = require('../treadmill.js');
const apiRouter = express.Router();
const Decimal = require('decimal.js');

// All of these functions can be hit by visiting /api/functionName
const routing = {
    setSpeed: (req, res) => {
        console.log(req.query);
        let logMessage = `Could not set speed. Must pass "mph" parameter.`;

        if (req.query && req.query.mph) {
            const mph = new Decimal(req.query.mph);
            logMessage = `Setting speed to ${mph.toFixed(1)}mph`;

            console.log(logMessage);
            treadmill.setSpeed(mph);
            res.send(logMessage);
        } else {
            console.log(logMessage);
            res.send(logMessage);
        }
    },
    getSpeed: (_req, res) => {
        const treadmillSpeed = treadmill.currentSpeed.toFixed(1);
        const logMessage = `Returning treadmill speed of ${treadmillSpeed}mph`;
        console.log(logMessage);
        res.send(treadmillSpeed);
    },
    setIncline: (req, res) => {
        console.log(req.query);
        let logMessage = `Could not set incline. Must pass "grade" parameter.`;

        if (req.query && req.query.grade) {
            const grade = new Decimal(req.query.grade);
            logMessage = `Setting incline to ${grade.toFixed(1)}% grade`;

            console.log(logMessage);
            treadmill.goToIncline(grade);
            res.send(logMessage);
        } else {
            console.log(logMessage);
            res.send(logMessage);
        }
    },
    getIncline: (_req, res) => {
        const treadmillIncline = treadmill.currentIncline.toFixed(1);
        const logMessage = `Returning treadmill incline of ${treadmillIncline}% grade`;
        console.log(logMessage);
        res.send(treadmillIncline);
    },
    calibrateIncline: (_req, res) => {
        const logMessage = `Calibrating incline...`;
        console.log(logMessage);
        treadmill.calibrateIncline();
        res.send(treadmillIncline);
    },
};

const loggerMiddleware = (req, _res, next) => {
    const logMessage = {
        date: Date.now(),
        endpoint: req.originalUrl,
        params: req.params,
        query: req.query,
    };

    console.log(logMessage);
    next();
}

// Console log details for each request.
apiRouter.use(loggerMiddleware);

// Go through each property on our routing object and link it
// to an API endpoint URL.
Object.keys(routing).forEach(endpointName => {
    apiRouter.post(`/${endpointName}`, routing[endpointName]);
});

module.exports = apiRouter;
