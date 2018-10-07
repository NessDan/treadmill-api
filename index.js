const express = require('express');
const apiRouting = require('./routing/api.js');
const assistantRouting = require('./routing/assistant.js');
const routeLogger = require('./routing/logger.js');
const app = express();
const https = require('https');
const fs = require('fs');

app.use(express.json());
app.use(express.static('static')); // For LetsEncrypt
app.use(require('helmet')()); // For LetsEncrypt / Turning on SSL
app.use(routeLogger); // Logs out to STDOUT with useful request info.
app.use(`/api`, apiRouting);
app.use(`/assistant`, assistantRouting);

const options = {
    cert: fs.readFileSync('/etc/letsencrypt/live/treadmill.nessdan.net/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/treadmill.nessdan.net/privkey.pem'),
};

https.createServer(options, app).listen(443);
console.log(`Treadmill API now listening on SSL.`);
