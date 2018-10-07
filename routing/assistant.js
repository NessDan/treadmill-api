const express = require('express');
const treadmill = require('../treadmill/treadmill.js');
const assistantRouter = express.Router();

// All of these functions can be hit by visiting /api/functionName
const routing = {
  routeAssistantWebhook: (req, res) => {
    if (req && req.body && req.body.queryResult && req.body.queryResult.parameters.length) {
      let { mechanism, direction, directionAndMechanism } = req.body.queryResult.parameters;

      // Take our confusing directionAndMechanism and break it into
      // both mechanism and direction.
      if (directionAndMechanism && !mechanism || !direction) {
        switch (directionAndMechanism) {
          case 'faster':
          mechanism = 'speed';
          direction = 'up';
          break;
          case 'slower':
          mechanism = 'speed';
          direction = 'down';
          break;
          case 'incline':
          mechanism = 'incline';
          direction = 'up';
          break;
          case 'decline':
          mechanism = 'incline';
          direction = 'down';
          break;
        }
      }

      switch (mechanism) {
        case 'speed':
          switch (direction) {
            case 'up':
              treadmill.setSpeed(treadmill.targetSpeed.add(0.5));
              break;
            case 'down':
              treadmill.setSpeed(treadmill.targetSpeed.sub(0.5));
              break;
          }
          break;
        case 'incline':
          switch (direction) {
            case 'up':
              treadmill.setIncline(treadmill.targetIncline.add(0.5));
              break;
            case 'down':
              treadmill.setIncline(treadmill.targetIncline.sub(0.5));
              break;
          }
          break;
      }

      res.json({
        "payload": {
          "google": {
            "expectUserResponse": true,
            "richResponse": {
              "items": [
                {
                  "simpleResponse": {
                    "textToSpeech": "Done. How you livin', son?"
                  }
                }
              ]
            }
          }
        }
      });
    },
  };

  assistantRouter.post('/', routing.routeAssistantWebhook);

  module.exports = assistantRouter;
