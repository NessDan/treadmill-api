const noble = require("@abandonware/noble"); // Have to use this fork, main repo doesn't support Node 10

const treadmill = {
  heartRate: 0,
  startHeartRateServices: async () => {
    noble.on("discover", peripherals => {
      noble.stopScanning();
      treadmill.foundHeartRateDevice(peripherals);
    });

    noble.startScanning(["180d"]); // HR services only
  },
  foundHeartRateDevice: peripherals => {
    peripheral.once("connect", () => {});

    peripheral.connect(error => {
      if (error) {
        console.log("error");
        console.log(error);
      }
    });
  },
  connectedHeartRateDevice: () => {
    console.log("connected");

    peripheral.discoverSomeServicesAndCharacteristics(
      ["180d"],
      ["2a37"],
      treadmill.discoveredServicesAndCharacteristics
    );
  },
  discoverServicesAndCharacteristics: (error, services, characteristics) => {
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

        treadmill.setHeartRate(heartRate);
      });

      hrChar.subscribe(err => {
        if (err) {
          console.log("error subscribing to heart rate characteristic");
        }
      });
    }
  },
  setHeartRate: heartRate => {
    treadmill.heartRate = heartRate;
  },
  getHeartRate: () => {
    return treadmill.heartRate;
  }
};

module.exports = treadmill;
