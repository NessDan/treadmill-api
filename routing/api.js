const express = require("express");
const treadmill = require("../treadmill/treadmill.js");
const apiRouter = express.Router();

// All of these functions can be hit by visiting /api/functionName
const routing = {
  setSpeed: (req, res) => {
    if (req.query && req.query.mph) {
      const mph = req.query.mph;

      treadmill.setSpeed(mph);
      res.send(mph);
    } else {
      res.send();
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
      res.send();
    }
  },
  getIncline: (_req, res) => {
    const treadmillIncline = treadmill.getIncline();
    res.send(treadmillIncline);
  },
  getHeartRate: (_req, res) => {
    const heartRate = treadmill.getHeartRate().toString();
    res.send(heartRate);
  },
  calibrateIncline: (_req, res) => {
    treadmill.calibrateIncline();
    res.send();
  }
};

// Go through each property on our routing object and link it
// to an API endpoint URL.
Object.keys(routing).forEach(endpointName => {
  apiRouter.post(`/${endpointName}`, routing[endpointName]);
});

module.exports = apiRouter;
