const speedMethods = require('./speed.js');
const inclineMethods = require('./incline.js');
const onError = (err) => {
    // The app has crashed for some reason. Clean up everything and exit.
    console.log(err);
    treadmill.cleanUp();
    process.exit(1);
};
var domain = require('domain').create();
domain.on('error', onError);
process.on('uncaughtException', onError);



// TODO if program is CTRL + C'd or crashes, it needs to go to 0!! It doesn't as of right now
// TODO handle negative from setSpeed (if anything < 0 is inputted, bring it to 0)
const treadmill = {
    ...speedMethods,
    ...inclineMethods,
    initialize: () => {
        // In case the program crashed and they're still turned on
        // or if they don't initialize to off on `new Gpio`
        treadmill.cleanGpio();

        // We have no way of knowing what the incline is, so load from a file
        // we saved what the last known incline state was.
        treadmill.setLastKnownIncline();

        // Start main logic loops to that achieve the speed and incline
        // the user requests.
        treadmill.achieveTargetSpeedLoop();
        treadmill.achieveTargetInclineLoop();
    },
    cleanGpio: () => {
        treadmill.inclineWireOff();
        treadmill.declineWireOff();
        treadmill.speedWireOff();
    },
    cleanUp: () => {
        // Should get called on exit / termination

        // No longer update targeted speeds or inclines.
        clearInterval(treadmill.achieveTargetInclineLoopIntervalId);
        clearInterval(treadmill.achieveTargetSpeedLoopIntervalId);

        // Turn off all our wires.
        treadmill.cleanGpio();
    },
};

treadmill.initialize();

module.exports = treadmill;