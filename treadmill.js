// TODO Implement bigint to support floating point numbers.

const Gpio = require('pigpio').Gpio;
const speedWire = new Gpio(18, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const inclineWire = new Gpio(19, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const declineWire = new Gpio(26, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const speedInfoWire = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.RISING_EDGE });
const inclineInfoWire = new Gpio(6, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.RISING_EDGE });
const Decimal = require('decimal.js');
const {
    performance
} = require('perf_hooks');

// TODO if program is CTRL + C'd or crashes, it needs to go to 0!! It doesn't as of right now
// TODO handle negative from setSpeed (if anything < 0 is inputted, bring it to 0)
const treadmill = {
    initialize: () => {
        treadmill.inclineWireOff();
        treadmill.declineWireOff();
        treadmill.speedWireOff();

        treadmill.achieveTargetSpeedLoop();
        treadmill.achieveTargetInclineLoop();
        treadmill.measureIncline();
    },
    targetSpeed: new Decimal(0),
    currentSpeed: new Decimal(0),
    targetIncline: new Decimal(0), // This should be loaded from a file on load
    currentIncline: new Decimal(0), // This should be loaded from a file on load
    achieveTargetSpeedLoop: () => {
        // Going from 0mph to 6mph takes roughly 11s
        // https://photos.app.goo.gl/h2WShMgJdqL9JZsq5
        // Therefore, for every 1mph, it takes 1.833s
        // And since we update in 0.1 increments,
        // Every 0.1mph takes 0.18333s which is about 183ms
        const dutyCycleUpdaterFrequencyMs = 183;

        const translateMphToDutyCycle = (mph) => {
            /* EYEBALL TESTING
            At 70000 we get motion, super slow but it blinks normally and at least turns.
            80000 closer to .5mph?
            90000 no diff
            100000 no diff
            150000 no diff
            200000 speed increased. Close to 1mph+?
            300000 speed inc. A little lower than 3mph
            350000 speed inc. Feels linear increasing. This is around 4 or 5 mph EDIT 3.5mph according to google fit.
            350000 speed 3.53mph according to google fit.
            300000 speed is 3.11 mph
            400000 is 5.5mph from google fit
            150000 should be floor, slowest speed before anything added to it increases speed.


            Using stock console:
            1mph at 240fps = 1 rotation every 3.17s (Getting this at 205000)
            At 1mph, the tachometer triggers 154 times on average.
            That means 2mph would be 308 tach triggers.
            I finally reached 308 tach triggers using 61400 as a mph multiplier
            */

            // Using the above testing, I figured out the floor duty cycle
            const dutyCycleFloor = new Decimal(150000); // Slowest speed before things added increases speed Runs around 0.5mph?
            const mphToDutyCycleMultiplier = new Decimal(61400); // Increments of 1mph = 61400 duty cycle

            let dutyCycleForMph = mphToDutyCycleMultiplier.mul(mph).add(dutyCycleFloor);

            if (dutyCycleForMph.lte(dutyCycleFloor)) {
                return 0; // If we're asked to get the duty cycle for anything below 0.5mph, just return 0.
            }

            return dutyCycleForMph.toNumber(); // pigpio is expecting a number.
        };

        setInterval(() => {
            const haveWeReachedTarget = treadmill.targetSpeed.eq(treadmill.currentSpeed);

            if (!haveWeReachedTarget) {
                let speedChange = new Decimal(0.1);

                // Speed change is positive when going up,
                // But if the target is below our actual,
                // We slow down by negating the speedChange
                if (treadmill.targetSpeed.lt(treadmill.currentSpeed)) {
                    speedChange = speedChange.neg();
                }

                // TODO: temporary safety check Cap speed at 4mph
                if (speedChange && treadmill.currentSpeed.lt(4)) {
                treadmill.currentSpeed = treadmill.currentSpeed.add(speedChange);
                    const newDutyCycle = translateMphToDutyCycle(treadmill.currentSpeed);

                    console.log('targ: ', treadmill.targetSpeed.toNumber());
                    console.log('cur: ', treadmill.currentSpeed.toNumber());
                    console.log('duty: ', newDutyCycle);

                    speedWire.hardwarePwmWrite(treadmill.constants.speedWireFrequency, newDutyCycle);
                }
            }
        }, dutyCycleUpdaterFrequencyMs);
    },
    setSpeed: (mph) => {
        const mphUnsafe = Number.parseFloat(mph); // In case someone sent us a string-string...
        const mphDecimal = new Decimal(mphUnsafe);
        // TODO: The 4 needs to be in a constant, safety check
        if (!mphDecimal.isNaN() && !mphDecimal.isNeg() && mphDecimal.lt(4)) {
            const mphRounded = mphDecimal.toDP(1);
            treadmill.targetSpeed = mphRounded;
        }
    },
    achieveTargetInclineLoop: () => {
        const ticksPerGrade = new Decimal(4.111111);
        const translateGradeToTicks = (grade) => new Decimal(grade).mul(ticksPerGrade);

        // TODO WHEN YOU COME BACK TOMORROW:
        // target and current incline are going to be saved as GRADES
        // because of this, our calculations below are odd (since we are working in TACH TICKS)

        // IDEA: When target and current incline match, save to disk. Whenever they don't match, save a "bad"
        // to the file and when we boot, if it's "bad", force a re-calibrate.
        setInterval(() => {
            let haveWeReachedTarget = false;
            let isInclining = false;
            let isDeclining = false;
            let targetWire;

            if (treadmill.targetIncline.lt(treadmill.currentIncline)) {
                isDeclining = true;
                targetWire = declineWire;
            } else if (treadmill.targetIncline.gt(treadmill.currentIncline)) {
                isInclining = true;
                targetWire = inclineWire;
            } else {
                haveWeReachedTarget = true;
            }

            if (!haveWeReachedTarget) {
                let inclineChange = new Decimal(0.04111);

                // Incline change is positive when going up,
                // But if the target is below our actual,
                // We slow down by negating the speedChange
                if (treadmill.targetIncline.lt(treadmill.currentIncline)) {
                    inclineChange = inclineChange.neg();
                }

                const nextStepInIncline = treadmill.currentIncline.add(speedChange);

                if (isInclining && nextStepInIncline.gt(treadmill.targetIncline)) {
                    treadmill.currentIncline = treadmill.targetIncline;
                } else if (isDeclining && nextStepInIncline.lt(treadmill.targetIncline)) {
                    treadmill.currentIncline = treadmill.targetIncline;
                } else {
                    treadmill.currentIncline = nextStepInIncline;
                }

                if (!targetWire.digitalRead()) {
                    targetWire.digitalWrite(1);
                }
            } else {
                // We hit our target! Turn the wires off.
                if (inclineWire.digitalRead()) {
                    treadmill.inclineWireOff();
                }

                if (declineWire.digitalRead()) {
                    treadmill.declineWireOff();
                }
            }
        }, 10);

    },
    setIncline: (grade) => {
        treadmill.targetIncline = grade;
    },
    speedWireOn: (targetDutyCycle) => {
    },
    speedWireOff: () => {
        console.log(`Setting the speed duty cycle to 0`);
        speedWire.hardwarePwmWrite(treadmill.constants.speedWireFrequency, 0);
    },
    inclineWireOn: () => {
        console.log(`Flipping the incline wire on`);
        inclineWire.digitalWrite(1);
    },
    inclineWireOff: () => {
        console.log(`Flipping the incline wire off`);
        inclineWire.digitalWrite(0);
    },
    declineWireOn: () => {
        console.log(`Flipping the decline wire on`);
        declineWire.digitalWrite(1);
    },
    declineWireOff: () => {
        console.log(`Flipping the decline wire off`);
        declineWire.digitalWrite(0);
    },
    calibrateIncline: () => {

    },
    measureIncline: () => {
        let tickAccumulator = 0;
        let resetInterval;

        // From testing:
        // From bottom to top: 74 ticks of level === 1
        // Since the treadmill goes from Grade 15% -> -3% (18 total):
        // Each grade is 4.11111111 (74/18)
        // Baseline would be 12.3333333 but we can't do percentages? Gotta figure out how to do this.
        // For time, it takes ~68.5 seconds to go from bottom to top.
        // This means we incline at 1.08s per tick, or 1080 ms per 1 tick.
        // For time, it takes 70.2 seconds to go from top to bottom.
        // This means we decline at 1.054s per tick, or 1054 ms per 1 tick.

        // That makes the average time ~69.35 seconds.
        inclineInfoWire.on('interrupt', (level) => {
            if (level === 1) {
                clearTimeout(resetInterval);
                resetInterval = setTimeout(() => {
                    console.log('counted: ', tickAccumulator);
                    tickAccumulator = 0;
                    treadmill.inclineWireOff();
                    treadmill.declineWireOff();
                }, 3000);

                tickAccumulator += 1;
                console.log('a tick:, ', performance.now());
            }
        });
    },
    measureTachTiming: () => {
        let tickAccumulator = 0;
        let timingPerRotation = [];
        let tachPerMinInterval;
        let previousTachTimestamp;

        // From testing:
        // 1mph ~= 162 ticks in a minute
        // 1mph ~= 368ms per rotation
        speedInfoWire.on('interrupt', (level) => {
            if (level === 1) {
                if (treadmill.currentSpeed.eq(treadmill.targetSpeed) && !treadmill.targetSpeed.isZero()) {
                    if (!tachPerMinInterval) {
                        tachPerMinInterval = true; // temporarily set this so it doesn't get called again
                        setTimeout(() => {
                            console.log("Measuring tach stats...");
                            tickAccumulator = 0;
                            tachPerMinInterval = setInterval(() => {
                                const averageTimePerRotationInMs = timingPerRotation.reduce((prev, cur) => prev + cur) / timingPerRotation.length;
                                console.log('ticks per min:', tickAccumulator * 6);
                                console.log('time per tick (ms):', averageTimePerRotationInMs);
                                tickAccumulator = 0;
                                timingPerRotation = [];
                            }, 10000);
                        }, 2500);
                    }

                    tickAccumulator += 1;

                    const timeNow = performance.now();

                    if (previousTachTimestamp) {
                        timingPerRotation.push(timeNow - previousTachTimestamp);
                    }

                    previousTachTimestamp = timeNow;
                } else {
                    // the target speed has been changed, so reset everything
                    if (tachPerMinInterval) {
                        clearInterval(tachPerMinInterval);
                    }

                    tickAccumulator = 0;
                    timingPerRotation = [];
                }
            }
        });

    },
    getSpeed: () => {
    },
    constants: {
        speedWireFrequency: 20, // Treadmill uses 20Hz freq from testing.
    }
};

treadmill.initialize();

module.exports = treadmill;
