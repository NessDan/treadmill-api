const Gpio = require("pigpio").Gpio;
const Decimal = require("decimal.js");
const speedWire = new Gpio(18, {
  mode: Gpio.OUTPUT,
  pullUpDown: Gpio.PUD_DOWN
});
const speedInfoWire = new Gpio(22, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  edge: Gpio.RISING_EDGE
});
const { performance } = require("perf_hooks");
const constants = require("./constants.js");

const treadmill = {
  targetSpeed: new Decimal(0),
  currentSpeed: new Decimal(0),
  translateMphToDutyCycle: function(mph) {
    /*
            THE MIGHTY SPREADSHEET OF TESTING AND DATA!!!
            https://docs.google.com/spreadsheets/d/1iB9PY8yc2AVhMQdQ8LYhLKZ4KrGB5Nou8P9aVCMPZko/edit?usp=sharing
        */
    /*
        IGNORE THIS EYEBALL TESTING, USE SPREADSHEET!!
        ALL OF THIS IS KEPT FOR SENTIMENTAL REASONS ONLY!!!
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
        Using this video at 240fps: https://photos.app.goo.gl/SZ999Jae4BVD6DwYA
        1mph: [3.092,3.168,3.155,3.145,3.260,3.215,3.171,3.253,3.147,3.140,3.169,3.327]
        ^ avg'd, 3.186833s / rotation (in slow-mo)
        240fps -> 29.276fps (8.19728124x slow motion)
        3.186833 / 8.19728124 = 1 rotation / 0.38876706882390677s (in real-time) (or 388.767ms)
        At duty cycle 204300 = 388.796ms (close enough!)
        So 204300 = 1mph
        2mph = 388.767ms / 2 = 0.194383534s = 194.383ms per rotation
        At duty cycle 269300 = 194.371ms (close enough!)
        4mph = 194.383ms / 2 = 0.097191767s = 97.191ms per rotation
        269300-204300=65000 per mph duty cycle increase
        So 4mph will possibly be 399300.
        At duty cycle 399300 = 97.160ms
        Therefore, duty cycle / mph = 65000
        */

    // Using the above testing, I figured out the floor duty cycle
    // Duty cycle at 1mph - 1mph increment = duty cycle floor.
    const dutyCycleFloorNoWalking = new Decimal(139300);
    const dutyCycleFloorPersonWalking = new Decimal(145150); // 160lb person walking on treadmill raises floor.
    const dutyCycleFloor = dutyCycleFloorPersonWalking;
    const mphToDutyCycleMultiplier = new Decimal(58500); // Increments of 1mph

    let dutyCycleForMph = mphToDutyCycleMultiplier.mul(mph).add(dutyCycleFloor);

    if (dutyCycleForMph.lte(dutyCycleFloor)) {
      return 0; // If we're asked to get the duty cycle for anything below 0.5mph, just return 0.
    }

    return dutyCycleForMph.toDP(0).toNumber(); // pigpio is expecting a number with no decimals.
  },
  graduallyAchieveTargetSpeed: function() {
    // Going from 0mph to 6mph takes roughly 11s
    // https://photos.app.goo.gl/h2WShMgJdqL9JZsq5
    // Therefore, for every 1mph, it takes 1.833s
    // So every 1s the mph changes 0.545553737mph
    // And every 1ms the mph changes 0.000545553737mph
    // Every 100ms we change speed at 0.0545553737mph
    // ALSO every 0.1mph takes 0.18333s which is about 183ms
    const weReachedTarget = this.targetSpeed.eq(this.currentSpeed);

    if (weReachedTarget) {
      return;
    }

    // Let's update our speed below:
    let speedChange = constants.speedChangeEveryInterval;
    let isIncreasing = this.currentSpeed.lt(this.targetSpeed);
    let isDecreasing = this.currentSpeed.gt(this.targetSpeed);

    if (this.currentSpeed.lte(constants.maxSpeed)) {
      if (isIncreasing) {
        // If we're increasing, cap the currentSpeed at targetSpeed or maxSpeed (prevents overshooting / way too fast)
        this.currentSpeed = Decimal.min(
          this.currentSpeed.add(speedChange),
          this.targetSpeed,
          constants.maxSpeed
        );
      } else if (isDecreasing) {
        // If we're decreasing, cap the currentSpeed at targetSpeed or 0 (prevents overshooting / negative)
        this.currentSpeed = Decimal.max(
          this.currentSpeed.sub(speedChange),
          this.targetSpeed,
          0
        );
      }
      const newDutyCycle = this.translateMphToDutyCycle(
        this.currentSpeed
      );

      console.log("targ: ", this.targetSpeed.toNumber());
      console.log("cur: ", this.currentSpeed.toNumber());
      console.log("duty: ", newDutyCycle);

      this.setSpeedWire(newDutyCycle);
    }
  },
  setSpeed: function(mph) {
    const mphUnsafe = Number.parseFloat(mph); // In case someone sent us a string-string...
    const mphDecimal = new Decimal(mphUnsafe);

    console.log("mphDecimal: ", mphDecimal.toNumber());
    if (
      !mphDecimal.isNaN() &&
      !mphDecimal.isNeg() &&
      mphDecimal.lte(constants.maxSpeed)
    ) {
      console.log("mphDecimal is valid.");
      const mphRounded = mphDecimal.toDP(1);
      this.targetSpeed = mphRounded;
    }
  },
  changeSpeed: function(mph) {
    // For changing speed relatively.
    this.setSpeed(this.targetSpeed.add(mph));
  },
  startTreadmill: function() {
    if (this.targetSpeed.isZero()) {
      this.setSpeed(constants.startSpeed);
    }
  },
  stopTreadmill: function() {
    this.setSpeed(0);
  },
  setSpeedWire: function(targetDutyCycle) {
    console.log(`Setting the speed duty cycle to ${targetDutyCycle}`);
    speedWire.hardwarePwmWrite(constants.speedWireFrequency, targetDutyCycle);
  },
  speedWireOff: function() {
    console.log(`Setting the speed duty cycle to 0`);
    speedWire.hardwarePwmWrite(constants.speedWireFrequency, 0);
  },
  measureTachTiming: function() {
    let tickAccumulator = 0;
    let timingPerRotation = [];
    let tachPerMinInterval;
    let previousTachTimestamp;

    // From testing:
    // 1mph ~= 162 ticks in a minute
    // 1mph ~= 368ms per rotation
    speedInfoWire.on("interrupt", level => {
      if (level === 1) {
        if (
          this.currentSpeed.eq(this.targetSpeed) &&
          !this.targetSpeed.isZero()
        ) {
          if (!tachPerMinInterval) {
            tachPerMinInterval = true; // temporarily set this so it doesn't get called again
            setTimeout(() => {
              console.log("Measuring tach stats...");
              tickAccumulator = 0;
              tachPerMinInterval = setInterval(() => {
                const averageTimePerRotationInMs =
                  timingPerRotation.reduce((prev, cur) => prev + cur) /
                  timingPerRotation.length;
                console.log("ticks per min:", tickAccumulator * 6);
                console.log("time per tick (ms):", averageTimePerRotationInMs);
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
  getSpeed: function() {
    return this.targetSpeed.toString();
  }
};

module.exports = treadmill;
