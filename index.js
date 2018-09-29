const logging = require('logger.js');
const express = require('express');
const apiRouting = require('./routing/api.js');
const app = express();
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new (winston.transports.DailyRotateFile)({
  dirname: '/var/log/treadmill/',
  filename: 'api-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = new (winston.Logger)({
  transports: [
    transport
  ]
});

logger.info('TEST');

app.use(`/api`, apiRouting);
app.listen(3000, () => logger.info(`Example app listening on port 3000!`));


module.exports.logger = logger;
