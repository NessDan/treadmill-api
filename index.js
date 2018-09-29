const express = require('express');
const apiRouting = require('./routing/api.js');
const app = express();

app.use(`/api`, apiRouting);
app.listen(3000, () => console.log(`Example app listening on port 3000!`));
