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
  initialize: function() {
    this.self = treadmill;

    // In case the program crashed and they're still turned on
    // or if they don't initialize to off on `new Gpio`
    this.cleanGpio();

    // We have no way of knowing what the incline is, so load from a file
    // we saved what the last known incline state was.
    this.setLastKnownIncline();

    // Search, connect, and read HR data
    //this.startHeartRateServices();

    // Keep speed and incline in sync with what the user wants.
    this.updateLogicLoop();
  },
  updateLogicLoopIntervalId: 0,
  updateLogicLoop: function() {
    // Sets an interval where different functions can run at an X ms loop.
    this.updateLogicLoopIntervalId = setInterval(() => {
      // Start main logic loops to that achieve the speed and incline
      // the user requests.
      this.graduallyAchieveTargetSpeed();
      this.graduallyAchieveTargetIncline();
    }, constants.updateLogicLoopInterval);
  },
  cleanGpio: function() {
    this.inclineWireOff();
    this.declineWireOff();
    this.speedWireOff();
  },
  cleanUp: function() {
    // Should get called on exit / termination

    // No longer update targeted speeds or inclines.
    clearInterval(this.updateLogicLoopIntervalId);

    // Turn off all our wires.
    this.cleanGpio();
  }
};

treadmill.initialize();

module.exports = treadmill;
