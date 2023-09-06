const express = require("express");
const apiRouting = require("./routing/api.js");
const assistantRouting = require("./routing/assistant.js");
const routeLogger = require("./routing/logger.js");
const basicAuth = require("express-basic-auth");
const app = express();
const fs = require("fs");
const cors = require("cors");

// Load up the authorization file
const password = fs.readFileSync("password", "utf8").trim();

app.use(cors());
app.use(express.json());
if (password) {
  app.use(
    basicAuth({
      users: {
        admin: password,
      },
    })
  );
}
app.use(routeLogger); // Logs out to STDOUT with useful request info.
app.use(express.static("web"));
app.use(`/api`, apiRouting);
app.use(`/assistant`, assistantRouting);

app.listen(80, () => {
  console.log(`Treadmill API now listening.`);
});
