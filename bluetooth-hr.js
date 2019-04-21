//const noble = require('noble');
const noble = require('@abandonware/noble');

noble.on('discover', (per) => { console.log(per);});

noble.startScanning(["180d"]); // HR services only
//noble.startScanning(); // any service UUID, no duplicates
