const express = require('express');
const apiRouting = require('routing/api');
const app = express();

app.post(`/api`, apiRouting);
app.listen(3000, () => console.log(`Example app listening on port 3000!`));
