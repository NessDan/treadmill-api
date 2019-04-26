//const noble = require('noble');
const noble = require("@abandonware/noble");

noble.on("discover", peripheral => {
  noble.on("scanStop", () => {
    console.log("scan stopped");
    peripheral.once("connect", () => {
      console.log("connected");
      peripheral.once("servicesDiscover", services => {
        console.log("discovered listener");
        console.log(services);
      });
      // peripheral.discoverServices(["180d"], (error, services) => {
      peripheral.discoverSomeServicesAndCharacteristics(
        ["180d"],
        ["2a37"],
        (error, services, characteristics) => {
          console.log("discovered");
          if (error) {
            console.log("err2", error);
          }

          console.log(services);
          console.log(characteristics);
          const hrChar = characteristics[0];

          if (hrChar) {
            hrChar.on("data", (data, isNotification) => {
              console.log("HR data", parseInt(data.toString("hex"), 16));
            });

            hrChar.subscribe(err => {
              if (err) {
                console.log("error subscribing to hrchar");
              }
            });
          }
        }
      );
    });

    peripheral.connect(error => {
      if (error) {
        console.log("error");
        console.log(error);
      }
    });
  });

  console.log(peripheral);
  noble.stopScanning();
});

noble.startScanning(["180d"]); // HR services only
//noble.startScanning(); // any service UUID, no duplicates
