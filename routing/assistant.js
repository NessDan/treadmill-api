const express = require('express');
const treadmill = require('../treadmill/treadmill.js');
const assistantRouter = express.Router();

// All of these functions can be hit by visiting /api/functionName
const routing = {
  routeAssistantWebhook: (req, res) => {
    if (req && req.body && req.body.queryResult && req.body.queryResult.action) {
      if (req.body.queryResult.action === 'treadmill.start') {
        treadmill.setSpeed(1);
      }
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
