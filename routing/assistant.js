const express = require('express');
const treadmill = require('../treadmill/treadmill.js');
const assistantRouter = express.Router();

// All of these functions can be hit by visiting /api/functionName
const routing = {
  routeAssistantWebhook: (req, res) => {
    let error = false;
    let response = "Done."; // By default, just return "Done."

    if (req && req.body && req.body.queryResult && req.body.queryResult.parameters) {
      const query = req.body.queryResult;
      switch (query.intent.displayName) {
        case "Treadmill Start":
          treadmill.startTreadmill();
          break;
        case "Treadmill Stop":
          treadmill.stopTreadmill();
          break;
        case "Treadmill Incline":
          treadmill.changeIncline(1);
          break;
        case "Treadmill Decline":
          treadmill.changeIncline(-1);
          break;
        case "Treadmill Faster":
          treadmill.changeSpeed(0.2);
          break;
        case "Treadmill Slower":
          treadmill.changeSpeed(-0.2);
          break;
        case "Get Speed":
          response = `${treadmill.getSpeed()} mph.`;
          break;
        case "Get Incline":
          response = treadmill.getIncline() + "%.";
        default:
          error = true;
          console.log(query.intent);
          break;
      }
    }

    // If an error occurred then change the response.
    response = error ? "Error." : response;

    res.json({
      "payload": {
        "google": {
          "expectUserResponse": false,
          "richResponse": {
            "items": [
              {
                "simpleResponse": {
                  "textToSpeech": response,
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
