const MiBand = require('miband');

const device = await bluetooth.requestDevice({
  filters: [
    { services: [ MiBand.advertisementService ] }
  ],
  optionalServices: MiBand.optionalServices
});

const server = await device.gatt.connect();

let miband = new MiBand(server);
await miband.init();

log('Notifications demo...')
await miband.showNotification('message');
