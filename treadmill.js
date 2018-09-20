// TODO Implement bigint to support floating point numbers.

const Gpio = require('pigpio').Gpio;
const speedWire = new Gpio(18, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const inclineWire = new Gpio(19, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const declineWire = new Gpio(26, { mode: Gpio.OUTPUT, pullUpDown: Gpio.PUD_DOWN });
const speedInfoWire = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.RISING_EDGE });
const Decimal = require('decimal.js');

// TODO if program is CTRL + C'd or crashes, it needs to go to 0!! It doesn't as of right now
// TODO handle negative from setSpeed (if anything < 0 is inputted, bring it to 0)
const treadmill = {
    initialize: () => {
        treadmill.achieveTargetSpeedLoop();
        treadmill.measureTachPerMin();
    },
    targetSpeed: new Decimal(0),
    currentSpeed: new Decimal(0),
    achieveTargetSpeedLoop: () => {
        const speedWireFrequency = 20; // Treadmill uses 20Hz freq from testing.
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

            50760 is the mph multiplier (Just going off of feel)


            1mph at 240fps = 1 rotation every 3.17s (Getting this at 205000)
            2mph at 240fps = 1 rotation every 1.74s (Getting this at 260000)
            1mph increments = 55000

            */

            // Using the above testing, I figured out the floor duty cycle
            const dutyCycleFloor = new Decimal(150000); // Slowest speed before things added increases speed Runs around 0.5mph?
            const mphToDutyCycleMultiplier = new Decimal(55000); // Increments of 1mph = 55000 duty cycle

            let dutyCycleForMph = mphToDutyCycleMultiplier.mul(mph).add(dutyCycleFloor);

            if (dutyCycleForMph.lte(dutyCycleFloor)) {
                return 0; // If we're asked to get the duty cycle for anything below 0.5mph, just return 0.
            }

            return dutyCycleForMph.toNumber(); // pigpio is expecting a number.
        };

        setInterval(() => {
            let speedChange;

            if (treadmill.targetSpeed.gt(treadmill.currentSpeed)) {
                speedChange = new Decimal(0.1);
            } else if (treadmill.targetSpeed.lt(treadmill.currentSpeed)) {
                speedChange = new Decimal(-0.1);
            }

            // TODO: temporary safety check Cap speed at 4mph
            if (speedChange && treadmill.currentSpeed.lt(4)) {
            treadmill.currentSpeed = treadmill.currentSpeed.add(speedChange);
                const newDutyCycle = translateMphToDutyCycle(treadmill.currentSpeed);

                console.log('targ: ', treadmill.targetSpeed.toNumber());
                console.log('cur: ', treadmill.currentSpeed.toNumber());
                console.log('duty: ', newDutyCycle);

                speedWire.hardwarePwmWrite(speedWireFrequency, newDutyCycle);
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
    speedWireOn: (targetDutyCycle) => {
    },
    speedWireOff: () => {
        // speedWire.digitalWrite(0);
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
        speedInfoWire.on('interrupt', (level) => {
            // Everytime the incline motor sends a pulse, this should trigger.
            // Set some sort of listener so that when we stop receiving this signal
            // to know we've reached MAXIMUM CLIIIINE
            // TODO: See how many pulses it takes to get to stable incline.
            // Probably best to use the recorded video to get an average feel for it.
        });
    },
    measureTachPerMin: () => {
        let ticksPerMin = 0;
        let tachPerMinInterval;

        speedInfoWire.on('interrupt', (level) => {
            if (level === 1) {
                // Once the treadmill starts moving, wait 2.5s and then
                // kick off a 60s-interval that tracks the tachs.
                if (!tachPerMinInterval) {
                    tachPerMinInterval = true; // temporarily set this so it doesn't get called again
                    setTimeout(() => {
                        console.log("Measuring tach per minute...");
                        ticksPerMin = 0;
                        tachPerMinInterval = setInterval(() => {
                            console.log('ticks per min:', ticksPerMin);
                            ticksPerMin = 0;
                        }, 60000);
                    }, 2500);
                }

                ticksPerMin += 1;
                console.log(ticksPerMin);
            }
        });

    },
    getSpeed: () => {
        // ticks per min: 907967
        // ticks per min: 904348
        // ticks per min: 904434
        // ticks per min: 905307
        // ticks per min: 904922
        // ticks per min: 904966
        // ticks per min: 918236
        // ticks per min: 932304
        // ticks per min: 932110
        // ticks per min: 931905
        // ticks per min: 932081
        // average after warmed up per min: 932100
    },
    constants: {

    }
};

treadmill.initialize();

module.exports = treadmill;
