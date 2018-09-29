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

module.exports = logger;
