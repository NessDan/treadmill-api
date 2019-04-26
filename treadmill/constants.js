const Decimal = require("decimal.js");

const constants = {
  maxSpeed: new Decimal(4),
  startSpeed: new Decimal(2),
  updateLogicLoopInterval: 100, // Update speed / incline every 100ms
  speedWireFrequency: 20, // Treadmill uses 20Hz freq from testing.
  inclineTachTimeoutMs: 2000, // After 2s, we know incline is no longer running.
  maximumGrade: new Decimal(19), // Console board shows -3% -> 15% so 19 steps total.
  safeInclineGradeEveryMs: new Decimal(0.000268475343), // 19 / 70.77s = 0.268475343 grades / s
  safeDeclineGradeEveryMs: new Decimal(0.000271273558), // 19 / 70.04s = 0.271273558 grades / s
  safeSpeedChangeEveryMs: new Decimal(0.000545454545) // 6mph takes roughly 11s = 0.545454545 mph / s
};

// const ticksPerGrade = new Decimal(4.111111);
constants.inclineAmountEveryInterval = constants.safeInclineGradeEveryMs.mul(
  constants.updateLogicLoopInterval
);
constants.declineAmountEveryInterval = constants.safeDeclineGradeEveryMs.mul(
  constants.updateLogicLoopInterval
);
constants.speedChangeEveryInterval = constants.safeSpeedChangeEveryMs.mul(
  constants.updateLogicLoopInterval
);

module.exports = constants;
