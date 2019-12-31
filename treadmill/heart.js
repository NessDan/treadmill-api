const noble = require("@abandonware/noble"); // Have to use this fork, main repo doesn't support Node 10

const treadmill = {
  heartRate: 0,
  startHeartRateServices: async function() {
    noble.on("discover", peripheral => {
      noble.stopScanning();
      this.foundHeartRateDevice(peripheral);
    });

    noble.startScanning(["180d"]); // HR services only
  },
  foundHeartRateDevice: function(peripheral) {
    peripheral.connect(error => {
      if (error) {
        console.log("error");
        console.log(error);
      }

      peripheral.discoverSomeServicesAndCharacteristics(
        ["180d"], // Heart Rate service
        ["2a37"], // Heart Rate characteristic
        this.discoveredServicesAndCharacteristics
      );
    });
  },
  discoveredServicesAndCharacteristics: function(
    error,
    services,
    characteristics
  ) {
    console.log("discovered services & characteristics");

    if (error) {
      console.log("err2", error);
    }

    console.log(services);
    console.log(characteristics);
    const hrChar = characteristics[0];

    if (hrChar) {
      hrChar.on("data", data => {
        const heartRate = parseInt(data.toString("hex"), 16);

        this.setHeartRate(heartRate);
      });

      hrChar.subscribe(err => {
        if (err) {
          console.log("error subscribing to heart rate characteristic");
        }
      });
    }
  },
  setHeartRate: function(heartRate) {
    this.heartRate = heartRate;
  },
  getHeartRate: function() {
    return this.heartRate;
  }
};

module.exports = treadmill;
