const Gpio = require('pigpio').Gpio;
const Decimal = require('decimal.js');
const fs = require('fs');
const inclineFilePath = '/lastInclinePosition.txt';
const inclineWire = new Gpio(19, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const declineWire = new Gpio(26, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const inclineInfoWire = new Gpio(6, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.RISING_EDGE });
const {
    performance
} = require('perf_hooks');
const constants = require('./constants.js');

const treadmill = {
    targetGrade: new Decimal(0), // This should be loaded from a file on load
    currentGrade: new Decimal(0), // This should be loaded from a file on load
    isInclining: false,
    isDeclining: false,
    isCalibrating: false,
    achieveTargetInclineLoop: () => {
        // const ticksPerGrade = new Decimal(4.111111);
        // const translateGradeToTicks = (grade) => new Decimal(grade).mul(ticksPerGrade);
        const inclineValueUpdateInterval = 10; // Every 10ms we check and re-target our incline.
        let inclineAmountEveryInterval = constants.safeInclineGradeValueEveryMs * inclineValueUpdateInterval;
        let declineAmountEveryInterval = constants.safeDeclineGradeValueEveryMs * inclineValueUpdateInterval;

        setInterval(() => {
            if (treadmill.isCalibrating) {
                return;
            }

            // When we've reached the target after it being set:
            if (treadmill.targetGrade.eq(treadmill.currentGrade) && (treadmill.isInclining || treadmill.isDeclining)) {
                console.log("Incline position reached");
                treadmill.inclineWireOff();
                treadmill.declineWireOff();
                treadmill.saveToInclineFile(treadmill.currentGrade);
            } else if (treadmill.currentGrade.lt(treadmill.targetGrade)) {
                if (!treadmill.isInclining) {
                    treadmill.inclineWireOn();
                }

                // currentGrade should never be greater than targetGrade or max grade going up.
                treadmill.currentGrade = Decimal.min(treadmill.currentGrade.add(inclineAmountEveryInterval), treadmill.targetGrade, constants.maximumGrade);
            } else if (treadmill.currentGrade.gt(treadmill.targetGrade)) {
                // isDeclining could do digitalRead every time or be a saved value.
                // https://www.npmjs.com/package/pigpio#performance
                if (!treadmill.isDeclining) {
                    treadmill.declineWireOn();
                }

                // currentGrade should never be lower than targetGrade or 0 going down.
                treadmill.currentGrade = Decimal.max(treadmill.currentGrade.sub(declineAmountEveryInterval), treadmill.targetGrade, 0);
            }
        }, 10);
    },
    setIncline: (grade) => {
        // TODO add sanity check
        treadmill.targetGrade = new Decimal(grade);
    },
    inclineWireOn: () => {
        console.log(`Flipping the incline wire on. Current: ${treadmill.currentGrade} Target: ${treadmill.targetGrade}`);
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
        treadmill.watchForInclineLimitReached();
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
        treadmill.watchForInclineLimitReached();
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
    countdownToInclineLimitInterval: 0,
    watchForInclineLimitReached: () => {
        let inclineDeclineWireOff;
        let limitGrade;
        let isIncliningOrDeclining;

        if (treadmill.isInclining) {
            inclineDeclineWireOff = treadmill.inclineWireOff;
            limitGrade = constants.maximumGrade;
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
            // TODO: BUG: We have to kill this when we swap from incline -> decline -> incline, it goes all the way
            if (isIncliningOrDeclining()) {
                console.log('Incline motor hit limit.');
                inclineInfoWire.off('interrupt', restartCountdown);
                treadmill.targetGrade = limitGrade;
                treadmill.currentGrade = limitGrade;
                inclineDeclineWireOff();
                treadmill.saveToInclineFile(limitGrade);
                treadmill.isCalibrating = false;
            }
        };
        const restartCountdown = () => {
            clearInterval(treadmill.countdownToInclineLimitInterval);
            treadmill.countdownToInclineLimitInterval = setTimeout(weHitLimit, constants.inclineTachTimeoutMs);
        };

        // Clear any previous countdowns / interrupt listeners and start the new ones.
        restartCountdown();
        inclineInfoWire.off('interrupt', restartCountdown);
        inclineInfoWire.on('interrupt', restartCountdown);
    },
    calibrateIncline: () => {
        // Stop the incline achieve function with this boolean.
        treadmill.isCalibrating = true;
        // Extra safety additions.
        treadmill.targetGrade = new Decimal(0);
        treadmill.currentGrade = new Decimal(0);
        // Because declining the treadmill down non-stop will automatically trigger a calibration event.
        treadmill.declineWireOn();
    },
    measureIncline: () => {
        let tickAccumulator = 0;
        let resetInterval;

        // From testing:
        // From bottom to top: 74 ticks of level === 1
        // Since the treadmill goes from Grade 15% -> -3% (19 total):
        // Each grade is 3.89473684 (74/19)
        // Baseline would be 11.6842105 but we can't do percentages? Gotta figure out how to do this.
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
        const lastKnownInclineFromFile = fs.readFileSync(inclineFilePath, { encoding: 'utf8', flag: 'w+' });
        console.log(`Incline file loaded, contents: ${lastKnownInclineFromFile}`);

        if (!lastKnownInclineFromFile || lastKnownInclineFromFile === '-1') {
            // We don't know what the last known incline was, we need to calibrate.
            treadmill.calibrateIncline();
        } else {
            const unsafeIncline = Number.parseFloat(lastKnownInclineFromFile); // In case someone sent us a string...
            const lastKnownIncline = new Decimal(unsafeIncline);

            if (!lastKnownIncline.isNaN() && !lastKnownIncline.isNeg() && lastKnownIncline.lt(constants.maximumGrade)) {
                treadmill.targetGrade = lastKnownIncline;
                treadmill.currentGrade = lastKnownIncline;
            }
        }
    },
    saveToInclineFile: (grade) => {
        console.log(`Saving to incline file: ${grade}`);
        fs.writeFileSync(inclineFilePath, grade);
    },
    getIncline: () => {
        return treadmill.targetGrade.toNumber();
    },
};

module.exports = treadmill;
