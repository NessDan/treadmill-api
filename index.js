const express = require('express');
const apiRouting = require('./routing/api.js');
const app = express();
var winston = require('winston');
require('winston-daily-rotate-file');

var transport = new (winston.transports.DailyRotateFile)({
  dirname: '/var/log/treadmill/',
  filename: 'api-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

transport.on('rotate', function(oldFilename, newFilename) {
  // do something fun
});

var logger = new (winston.Logger)({
  transports: [
    transport
  ]
});

app.use(`/api`, apiRouting);
app.listen(3000, () => logger.info(`Example app listening on port 3000!`));


module.exports.logger = logger;
