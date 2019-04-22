//const noble = require('noble');
const noble = require('@abandonware/noble');

noble.on('discover', (peripheral) => {
    console.log(peripheral);
    noble.stopScanning();

    peripheral.connect((error) => {
        console.log('error');
        console.log(error);
    });
    // peripheral.discoverServices(["180d"], (error, services) => {
    peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
        if (error) {
            console.log('err2', error);
        }

        console.log(services);
        console.log(characteristics);
    });
});

noble.startScanning(["180d"]); // HR services only
//noble.startScanning(); // any service UUID, no duplicates
