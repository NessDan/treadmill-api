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
const fs = require('fs');
const inclineFilePath = 'lastInclinePosition.txt';

// TODO if program is CTRL + C'd or crashes, it needs to go to 0!! It doesn't as of right now
// TODO handle negative from setSpeed (if anything < 0 is inputted, bring it to 0)
const treadmill = {
    initialize: () => {
        // In case the program crashed and they're still turned on
        // or if they don't initialize to off on `new Gpio`
        treadmill.inclineWireOff();
        treadmill.declineWireOff();
        treadmill.speedWireOff();

        treadmill.setLastKnownIncline();

        treadmill.achieveTargetSpeedLoop();
        treadmill.achieveTargetInclineLoop();
        // treadmill.measureIncline();
    },
    targetSpeed: new Decimal(0),
    currentSpeed: new Decimal(0),
    targetGrade: new Decimal(0), // This should be loaded from a file on load
    currentGrade: new Decimal(0), // This should be loaded from a file on load
    isInclining: false,
    isDeclining: false,
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

                if (speedChange && treadmill.currentSpeed.lt(treadmill.constants.maxSpeed)) {
                treadmill.currentSpeed = treadmill.currentSpeed.add(speedChange);
                    const newDutyCycle = translateMphToDutyCycle(treadmill.currentSpeed);

                    console.log('targ: ', treadmill.targetSpeed.toNumber());
                    console.log('cur: ', treadmill.currentSpeed.toNumber());
                    console.log('duty: ', newDutyCycle);

                    treadmill.setSpeedWire(newDutyCycle);
                }
            }
        }, dutyCycleUpdaterFrequencyMs);
    },
    setSpeed: (mph) => {
        const mphUnsafe = Number.parseFloat(mph); // In case someone sent us a string-string...
        const mphDecimal = new Decimal(mphUnsafe);

        if (!mphDecimal.isNaN() && !mphDecimal.isNeg() && mphDecimal.lt(treadmill.constants.maxSpeed)) {
            const mphRounded = mphDecimal.toDP(1);
            treadmill.targetSpeed = mphRounded;
        }
    },
    achieveTargetInclineLoop: () => {
        // const ticksPerGrade = new Decimal(4.111111);
        // const translateGradeToTicks = (grade) => new Decimal(grade).mul(ticksPerGrade);
        let inclineEvery10ms = treadmill.constants.safeInclineGradeValueEvery10ms;
        let declineEvery10ms = treadmill.constants.safeDeclineGradeValueEvery10ms;

        setInterval(() => {
            // When we've reached the target after it being set:
            if (treadmill.targetGrade.eq(treadmill.currentGrade) && (treadmill.isInclining || treadmill.isDeclining)) {
                console.log("Incline position reached");
                treadmill.inclineWireOff();
                treadmill.declineWireOff();
                treadmill.treadmill.saveToInclineFile(treadmill.currentGrade);
            } else if (treadmill.currentGrade.lt(treadmill.targetGrade)) {
                if (!treadmill.isInclining) {
                    treadmill.inclineWireOn();
                }

                // currentGrade should never be greater than targetGrade or max grade going up.
                treadmill.currentGrade = Decimal.min(treadmill.currentGrade.add(inclineEvery10ms), treadmill.targetGrade, treadmill.constants.maximumGrade);
            } else if (treadmill.currentGrade.gt(treadmill.targetGrade)) {
                // isDeclining could do digitalRead every time or be a saved value.
                // https://www.npmjs.com/package/pigpio#performance
                if (!treadmill.isDeclining) {
                    treadmill.declineWireOn();
                }

                // currentGrade should never be lower than targetGrade or 0 going down.
                treadmill.currentGrade = Decimal.max(treadmill.currentGrade.sub(declineEvery10ms), treadmill.targetGrade, 0);
            }
        }, 10);
    },
    setIncline: (grade) => {
        treadmill.targetGrade = new Decimal(grade);
    },
    setSpeedWire: (targetDutyCycle) => {
        console.log(`Setting the speed duty cycle to ${targetDutyCycle}`);
        speedWire.hardwarePwmWrite(treadmill.constants.speedWireFrequency, targetDutyCycle);
    },
    speedWireOff: () => {
        console.log(`Setting the speed duty cycle to 0`);
        speedWire.hardwarePwmWrite(treadmill.constants.speedWireFrequency, 0);
    },
    inclineWireOn: () => {
        console.log(`Flipping the incline wire on`, performance.now());
        treadmill.declineWireOff();
        inclineWire.digitalWrite(1);

        // isInclining statically set to save from calling digitalRead too many times.
        // https://www.npmjs.com/package/pigpio#performance
        treadmill.isInclining = true;
        // We can no longer guarantee what the incline is once this starts so we save "bad".
        // It's up to our "reach target incline" function to re-save it once it confirms the incline.
        treadmill.saveToInclineFile('-1');
        // As we start inclining, this will make sure that when we hit a wall,
        // the incline wire will turn off and we'll mark the current position.
        treadmill.checkIfWeHitInclineLimit();
    },
    inclineWireOff: () => {
        console.log(`Flipping the incline wire off`, performance.now());
        inclineWire.digitalWrite(0);
        treadmill.isInclining = false;
    },
    inclineWireToggle: () => {
        console.log(`Toggling the incline wire`);
        if (treadmill.isInclining) {
            treadmill.inclineWireOff();
        } else {
            treadmill.inclineWireOn();
        }
    },
    declineWireOn: () => {
        console.log(`Flipping the decline wire on`, performance.now());
        treadmill.inclineWireOff();
        declineWire.digitalWrite(1);
        // isDeclining statically set to save from calling digitalRead too many times.
        // https://www.npmjs.com/package/pigpio#performance
        treadmill.isDeclining = true;
        // We can no longer guarantee what the incline is once this starts so we save "bad".
        // It's up to our "reach target incline" function to re-save it once it confirms the incline.
        treadmill.saveToInclineFile('-1');
        // As we start inclining, this will make sure that when we hit a wall,
        // the incline wire will turn off and we'll mark the current position.
        treadmill.checkIfWeHitInclineLimit();
    },
    declineWireOff: () => {
        console.log(`Flipping the decline wire off`, performance.now());
        declineWire.digitalWrite(0);
        treadmill.isDeclining = false;
    },
    declineWireToggle: () => {
        console.log(`Toggling the decline wire`);
        if (treadmill.isDeclining) {
            treadmill.declineWireOff();
        } else {
            treadmill.declineWireOn();
        }
    },
    checkIfWeHitInclineLimit: () => {
        let inclineDeclineWireOff;
        let limitGrade;
        let isIncliningOrDeclining;
        let countdownToInclineLimit;

        if (treadmill.isInclining) {
            inclineDeclineWireOff = treadmill.inclineWireOff;
            limitGrade = treadmill.constants.maximumGrade;
            isIncliningOrDeclining = () => {
                return treadmill.isInclining;
            };
        } else if (treadmill.isDeclining) {
            inclineDeclineWireOff = treadmill.declineWireOff;
            limitGrade = new Decimal(0);
            isIncliningOrDeclining = () => {
                return treadmill.isDeclining;
            };
        } else {
            return; // Function was called when we weren't inclining
        }

        const weHitLimit = () => {
            if (isIncliningOrDeclining()) {
                console.log('Incline motor hit limit.');
                inclineInfoWire.off('interrupt', restartCountdown);
                treadmill.targetGrade = limitGrade;
                treadmill.currentGrade = limitGrade;
                inclineDeclineWireOff();
                treadmill.saveToInclineFile(limitGrade);
            }
        };
        const restartCountdown = () => {
            clearInterval(countdownToInclineLimit);
            countdownToInclineLimit = setTimeout(weHitLimit, treadmill.constants.inclineTachTimeoutMs);
        };

        // Really starting the countdown right here.
        restartCountdown();
        inclineInfoWire.on('interrupt', restartCountdown);
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
        // Standing on it, bottom to top, 71.475s (Going to use this as absolute truth)
        //  1035ms per tick / 3970 ms per grade / (0.00252 grade per 10ms)
        // Standing on it, top to bottom, 69.037s
        // Watching video: top to bot 4.04 1.14.08 (70.04s)
        // Watching video: bot to top 0 1.10.77 (70.77s)

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
    setLastKnownIncline: () => {
        const lastKnownInclineFromFile = fs.readFileSync(inclineFilePath, {flag:'w+'});

        if (!lastKnownInclineFromFile || lastKnownInclineFromFile === '-1') {
            // We don't know what the last known incline was, we need to calibrate.
            treadmill.calibrateIncline();
        } else {
            const unsafeIncline = Number.parseFloat(lastKnownInclineFromFile); // In case someone sent us a string...
            const lastKnownIncline = new Decimal(unsafeIncline);

            if (!lastKnownIncline.isNaN() && !lastKnownIncline.isNeg() && lastKnownIncline.lt(treadmill.constants.maximumGrade)) {
                treadmill.targetGrade = lastKnownIncline;
                treadmill.currentGrade = lastKnownIncline;
            }
        }
    },
    saveToInclineFile: (grade) => {
        fs.writeFileSync(inclineFilePath, grade);
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
    cleanUp: () => {
        // Should get called on exit / termination
        inclineFile.closeSync();
        // TODO set GPIO outputs to 0
    },
    constants: {
        maxSpeed: new Decimal(4),
        speedWireFrequency: 20, // Treadmill uses 20Hz freq from testing.
        inclineTachTimeoutMs: 2000, // After 2s, we know incline is no longer running.
        maximumGrade: new Decimal(18), // Console board shows -3% -> 15% so 18 total.
        safeInclineGradeValueEvery10ms: new Decimal(0.002543), // 18 / 70.77s = 0.002543 grades / 10ms
        safeDeclineGradeValueEvery10ms: new Decimal(0.002569), // 18 / 70.04s = 0.002569 grades / 10ms
    }
};

treadmill.initialize();

module.exports = treadmill;
