const noble = require("@abandonware/noble"); // Have to use this fork, main repo doesn't support Node 10
const miBand = require("./heart/miband.js");

const HR_SERVICE_UUID = "180d";
const MIBAND_SERVICE_UUID = "fee0";

const treadmill = {
  heartRate: 0,
  startHeartRateServices: async function() {
    noble.on("discover", peripheral => {
      noble.stopScanning();
      this.foundHeartRateDevice(peripheral);
    });

    noble.startScanning([HR_SERVICE_UUID, MIBAND_SERVICE_UUID]); // HR + Miband services only
  },
  foundHeartRateDevice: function(peripheral) {
    if (peripheral.advertisement.localName === "MI Band 2") {
      this.miBandFound(peripheral);
    } else {
      // Generic HR found.
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
    }
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
  },
  ...miBand
};

module.exports = treadmill;
