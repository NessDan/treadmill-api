const noble = require("@abandonware/noble"); // Have to use this fork, main repo doesn't support Node 10

const treadmill = {
  heartRate: 0,
  startHeartRateServices: async () => {}
};

module.exports = treadmill;
