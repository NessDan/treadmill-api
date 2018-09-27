const express = require('express');
const treadmill = require('../treadmill/treadmill.js');
const apiRouter = express.Router();
const Decimal = require('decimal.js');

// All of these functions can be hit by visiting /api/functionName
const routing = {
    setSpeed: (req, res) => {
        if (req.query && req.query.mph) {
            const mph = req.query.mph;

            treadmill.setSpeed(mph);
            res.send(mph);
        } else {
            res.send(mph);
        }
    },
    getSpeed: (_req, res) => {
        const treadmillSpeed = treadmill.getSpeed();
        res.send(treadmillSpeed);
    },
    setIncline: (req, res) => {
        if (req.query && req.query.grade) {
            const grade = req.query.grade;

            treadmill.setIncline(grade);
            res.send(grade);
        } else {
            res.send(grade);
        }
    },
    getIncline: (_req, res) => {
        const treadmillIncline = treadmill.getIncline();
        res.send(treadmillIncline);
    },
    calibrateIncline: (_req, res) => {
        treadmill.calibrateIncline();
        res.send();
    },
    // decline: (_req, res) => {
    //     treadmill.declineWireToggle();
    //     res.send();
    // },
    // incline: (_req, res) => {
    //     treadmill.inclineWireToggle();
    //     res.send();
    // }
};

const loggerMiddleware = (req, _res, next) => {
    const logMessage = {
        date: Date.now(),
        endpoint: req.path,
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
