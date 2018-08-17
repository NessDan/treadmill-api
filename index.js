import express from 'express';
import apiRouting from 'routing/api';
const app = express();

app.post(`/api`, apiRouting);
app.listen(3000, () => console.log(`Example app listening on port 3000!`));
