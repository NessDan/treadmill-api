const speedMethods = require("./speed.js");
const inclineMethods = require("./incline.js");
const heartRateMethods = require("./heart.js");
const onError = err => {
  // The app has crashed for some reason. Clean up everything and exit.
  console.log("Error!");
  console.log(err);
  treadmill.cleanUp();
  process.exit(1);
};
const constants = require("./constants.js");
// Error Handling code to clear out GPIO
const domain = require("domain").create();
domain.on("error", onError);
process.on("unhandledRejection", onError);
process.on("uncaughtException", onError);
process.on("SIGINT", onError); // Handle CTRL + C, *nix only https://stackoverflow.com/a/20165643/231730
process.on("SIGHUP", onError); // SSH hangup (probably needed with SIGCONT)
process.on("SIGTERM", onError); // Handles `kill PID` command on linux
process.on("SIGCONT", onError); // Handle when SSH connection closes that was running the app

const treadmill = {
  ...speedMethods,
  ...inclineMethods,
  ...heartRateMethods,
  initialize: () => {
    // In case the program crashed and they're still turned on
    // or if they don't initialize to off on `new Gpio`
    treadmill.cleanGpio();

    // We have no way of knowing what the incline is, so load from a file
    // we saved what the last known incline state was.
    treadmill.setLastKnownIncline();

    // Search, connect, and read HR data
    treadmill.startHeartRateServices();

    // Keep speed and incline in sync with what the user wants.
    treadmill.updateLogicLoop();
  },
  updateLogicLoopIntervalId: 0,
  updateLogicLoop: () => {
    // Sets an interval where different functions can run at an X ms loop.
    treadmill.updateLogicLoopIntervalId = setInterval(() => {
      // Start main logic loops to that achieve the speed and incline
      // the user requests.
      treadmill.graduallyAchieveTargetSpeed();
      treadmill.graduallyAchieveTargetIncline();
    }, constants.updateLogicLoopInterval);
  },
  cleanGpio: () => {
    treadmill.inclineWireOff();
    treadmill.declineWireOff();
    treadmill.speedWireOff();
  },
  cleanUp: () => {
    // Should get called on exit / termination

    // No longer update targeted speeds or inclines.
    clearInterval(treadmill.updateLogicLoopIntervalId);

    // Turn off all our wires.
    treadmill.cleanGpio();
  }
};

treadmill.initialize();

module.exports = treadmill;
