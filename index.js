const express = require('express');
const apiRouting = require('./routing/api.js');
const app = express();
const https = require('https');
const fs = require('fs');

app.use(express.static('static')); // For LetsEncrypt
app.use(require('helmet')()); // For LetsEncrypt / Turning on SSL
app.use(`/api`, apiRouting);
//app.listen(80, () => console.log(`Treadmill API now listening.`));

const options = {
    cert: fs.readFileSync('/etc/letsencrypt/live/treadmill.nessdan.net/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/treadmill.nessdan.net/privkey.pem'),
};

https.createServer(options, app).listen(443);
console.log(`Treadmill API now listening on SSL.`);
