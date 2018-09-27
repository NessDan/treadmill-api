const Gpio = require('pigpio').Gpio;
const Decimal = require('decimal.js');
const speedWire = new Gpio(18, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const speedInfoWire = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.RISING_EDGE });
const {
    performance
} = require('perf_hooks');

const treadmill = {
    targetSpeed: new Decimal(0),
    currentSpeed: new Decimal(0),
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
            const weReachedTarget = treadmill.targetSpeed.eq(treadmill.currentSpeed);

            if (weReachedTarget) {
                return;
            }

            // Let's update our speed below:

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
    setSpeedWire: (targetDutyCycle) => {
        console.log(`Setting the speed duty cycle to ${targetDutyCycle}`);
        speedWire.hardwarePwmWrite(treadmill.constants.speedWireFrequency, targetDutyCycle);
    },
    speedWireOff: () => {
        console.log(`Setting the speed duty cycle to 0`);
        speedWire.hardwarePwmWrite(treadmill.constants.speedWireFrequency, 0);
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
};

module.exports = treadmill;
