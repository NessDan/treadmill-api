//const noble = require('noble');
const noble = require('@abandonware/noble');

noble.on('discover', (peripheral) => {
    noble.on('scanStop', () => {
        console.log('scan stopped');
        peripheral.once('connect', () => {
            console.log('connected');
            peripheral.once('servicesDiscover', (services) => {
                console.log(services);
            });
            peripheral.discoverAllServicesAndCharacteristics();
            // peripheral.discoverServices(["180d"], (error, services) => {
            /*
            peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                console.log('discovered');
                if (error) {
                    console.log('err2', error);
                }

                console.log(services);
                console.log(characteristics);
            });
            */
        });

        peripheral.connect((error) => {
            if (error) {
                console.log('error');
                console.log(error);
            }
        });

    });

    console.log(peripheral);
    noble.stopScanning();
});

noble.startScanning(["180d"]); // HR services only
//noble.startScanning(); // any service UUID, no duplicates
