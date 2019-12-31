const Gpio = require("pigpio").Gpio;
const Decimal = require("decimal.js");
const fs = require("fs");
const inclineFilePath = "lastInclinePosition.txt";
const inclineWire = new Gpio(6, {
  mode: Gpio.OUTPUT,
  pullUpDown: Gpio.PUD_DOWN
});
const declineWire = new Gpio(5, {
  mode: Gpio.OUTPUT,
  pullUpDown: Gpio.PUD_DOWN
});
const inclineInfoWire = new Gpio(25, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  edge: Gpio.RISING_EDGE
});
const { performance } = require("perf_hooks");
const constants = require("./constants.js");

const treadmill = {
  targetGrade: new Decimal(0), // This should be loaded from a file on load
  currentGrade: new Decimal(0), // This should be loaded from a file on load
  isInclining: false,
  isDeclining: false,
  isCalibrating: false,
  graduallyAchieveTargetIncline: function() {
    if (this.isCalibrating) {
      return;
    }

    // When we've reached the target after it being set:
    if (
      this.targetGrade.eq(this.currentGrade) &&
      (this.isInclining || this.isDeclining)
    ) {
      console.log("Incline position reached");
      this.inclineWireOff();
      this.declineWireOff();
      this.saveToInclineFile(this.currentGrade);
    } else if (this.currentGrade.lt(this.targetGrade)) {
      if (!this.isInclining) {
        this.inclineWireOn();
      }

      // currentGrade should never be greater than targetGrade or max grade going up.
      this.currentGrade = Decimal.min(
        this.currentGrade.add(constants.inclineAmountEveryInterval),
        this.targetGrade,
        constants.maximumGrade
      );
    } else if (this.currentGrade.gt(this.targetGrade)) {
      // isDeclining could do digitalRead every time or be a saved value.
      // https://www.npmjs.com/package/pigpio#performance
      if (!this.isDeclining) {
        this.declineWireOn();
      }

      // currentGrade should never be lower than targetGrade or 0 going down.
      this.currentGrade = Decimal.max(
        this.currentGrade.sub(constants.declineAmountEveryInterval),
        this.targetGrade,
        0
      );
    }
  },
  setIncline: function(grade, isTarget) {
    const unsafeIncline = Number.parseFloat(grade); // In case someone sent us a string...
    const incline = new Decimal(unsafeIncline);

    // Must be a number and below the maximum grade
    if (!incline.isNaN() && incline.lt(constants.maximumGrade)) {
      if (!isTarget && incline.lte(0)) {
        // If we're not setting current & target
        // and we're told to go to 0, just calibrate incline
        // Gets the same effect and puts us back at zero.
        this.calibrateIncline();
      } else {
        const gradeRounded = incline.toDP(1);
        this.targetGrade = gradeRounded;
        if (isTarget) this.currentGrade = gradeRounded;
      }
    }
  },
  changeIncline: function(grade) {
    this.setIncline(this.targetGrade.add(grade));
  },
  getIncline: function() {
    return this.targetGrade.toString();
  },
  inclineWireOn: function() {
    console.log(
      `Flipping the incline wire on. Current: ${this.currentGrade} Target: ${
        this.targetGrade
      }`
    );
    this.declineWireOff();
    inclineWire.digitalWrite(1);

    // isInclining statically set to save from calling digitalRead too many times.
    // https://www.npmjs.com/package/pigpio#performance
    this.isInclining = true;
    // We can no longer guarantee what the incline is once this starts so we save "bad".
    // It's up to our "reach target incline" function to re-save it once it confirms the incline.
    this.saveToInclineFile("-1");
    // As we start inclining, this will make sure that when we hit a wall,
    // the incline wire will turn off and we'll mark the current position.
    // this.watchForInclineLimitReached();
  },
  inclineWireOff: function() {
    console.log(
      `Flipping the incline wire off. Current: ${this.currentGrade} Target: ${
        this.targetGrade
      }`
    );
    inclineWire.digitalWrite(0);
    this.isInclining = false;
  },
  inclineWireToggle: function() {
    console.log(`Toggling the incline wire`);
    if (this.isInclining) {
      this.inclineWireOff();
    } else {
      this.inclineWireOn();
    }
  },
  declineWireOn: function() {
    console.log(
      `Flipping the decline wire on. Current: ${this.currentGrade} Target: ${
        this.targetGrade
      }`
    );
    this.inclineWireOff();
    declineWire.digitalWrite(1);
    // isDeclining statically set to save from calling digitalRead too many times.
    // https://www.npmjs.com/package/pigpio#performance
    this.isDeclining = true;
    // We can no longer guarantee what the incline is once this starts so we save "bad".
    // It's up to our "reach target incline" function to re-save it once it confirms the incline.
    this.saveToInclineFile("-1");
    // As we start inclining, this will make sure that when we hit a wall,
    // the incline wire will turn off and we'll mark the current position.
    this.watchForInclineLimitReached();
  },
  declineWireOff: function() {
    console.log(
      `Flipping the decline wire off. Current: ${this.currentGrade} Target: ${
        this.targetGrade
      }`
    );
    declineWire.digitalWrite(0);
    this.isDeclining = false;
  },
  declineWireToggle: function() {
    console.log(`Toggling the decline wire`);
    if (this.isDeclining) {
      this.declineWireOff();
    } else {
      this.declineWireOn();
    }
  },
  countdownToInclineLimitInterval: 0,
  watchForInclineLimitReached: function() {
    let inclineDeclineWireOff;
    let limitGrade;
    let isIncliningOrDeclining;

    if (this.isInclining) {
      inclineDeclineWireOff = this.inclineWireOff;
      limitGrade = constants.maximumGrade;
      isIncliningOrDeclining = () => {
        return this.isInclining;
      };
    } else if (this.isDeclining) {
      inclineDeclineWireOff = this.declineWireOff;
      limitGrade = new Decimal(0);
      isIncliningOrDeclining = () => {
        return this.isDeclining;
      };
    } else {
      return; // Function was called when we weren't inclining
    }

    const weHitLimit = () => {
      if (isIncliningOrDeclining()) {
        console.log("Incline motor hit limit.");
        inclineInfoWire.off("interrupt", restartCountdown);
        this.targetGrade = limitGrade;
        this.currentGrade = limitGrade;
        inclineDeclineWireOff();
        this.saveToInclineFile(limitGrade);
        this.isCalibrating = false;
      }
    };
    const restartCountdown = () => {
      clearTimeout(this.countdownToInclineLimitInterval);
      this.countdownToInclineLimitInterval = setTimeout(
        weHitLimit,
        constants.inclineTachTimeoutMs
      );
    };

    // Clear any previous countdowns / interrupt listeners and start the new ones.
    restartCountdown();
    inclineInfoWire.off("interrupt", restartCountdown);
    inclineInfoWire.on("interrupt", restartCountdown);
  },
  calibrateIncline: function() {
    // Stop the incline achieve function with this boolean.
    this.isCalibrating = true;
    // Extra safety additions.
    this.targetGrade = new Decimal(0);
    this.currentGrade = new Decimal(0);
    // Because declining the treadmill down non-stop will automatically trigger a calibration event.
    this.declineWireOn();
  },
  setLastKnownIncline: function() {
    let lastKnownInclineFromFile;

    try {
      lastKnownInclineFromFile = fs.readFileSync(inclineFilePath, {
        encoding: "utf8"
      });
      console.log(`Incline file loaded, contents: ${lastKnownInclineFromFile}`);
    } catch (e) {
      console.log(`Incline file doesn't exist.`);
    }

    if (!lastKnownInclineFromFile || lastKnownInclineFromFile === "-1") {
      // We don't know what the last known incline was, we need to calibrate.
      this.calibrateIncline();
    } else {
      this.setIncline(lastKnownInclineFromFile, true);
    }
  },
  saveToInclineFile: function(grade) {
    console.log(`Saving to incline file: ${grade}`);
    fs.writeFileSync(inclineFilePath, grade);
  },
  measureIncline: function() {
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

    inclineInfoWire.on("interrupt", level => {
      if (level === 1) {
        clearTimeout(resetInterval);
        resetInterval = setTimeout(() => {
          console.log("counted: ", tickAccumulator);
          tickAccumulator = 0;
          this.inclineWireOff();
          this.declineWireOff();
        }, 3000);

        tickAccumulator += 1;
        console.log("a tick:, ", performance.now());
      }
    });
  }
};

module.exports = treadmill;
