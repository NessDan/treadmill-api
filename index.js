const express = require('express');
const treadmill = require('./treadmill.js');
const app = express();



app.get(`/start`, treadmill.start);
app.get(`/setSpeed`, treadmill.setSpeed);
app.listen(3000, () => console.log(`Example app listening on port 3000!`));