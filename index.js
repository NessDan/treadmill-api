const express = require('express');
const treadmill = require('./treadmill.js');
const app = express();

app.post(`/start`, treadmill.start);
app.post(`/stop`, treadmill.stop);
app.post(`/setSpeed`, treadmill.setSpeed);
app.post(`/incline`, treadmill.increaseIncline);
app.post(`/decline`, treadmill.decreaseIncline);
app.listen(3000, () => console.log(`Example app listening on port 3000!`));
