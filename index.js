const express = require('express');
const treadmill = require('./treadmill.js');
const app = express();


treadmill.start();
app.get(`/start`, treadmill.start);
app.get(`/stop`, treadmill.stop);
app.get(`/setSpeed`, treadmill.setSpeed);
app.get(`/inclineUp`, treadmill.increaseIncline);
app.get(`/inclineDown`, treadmill.decreaseIncline);
app.listen(3000, () => console.log(`Example app listening on port 3000!`));
