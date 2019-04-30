const UUID_BASE = x => `0000${x}0000351221180009af100700`;
const UUID_SERVICE_MIBAND_2 = "fee1";
const UUID_CHAR_HR_CONTROL_POINT = "2a39";
const UUID_CHAR_HR_SUBSCRIBE = "2a37";
const crypto = require("crypto");

// TODO: this is constant for now, but should random and managed per-device
const key = new Buffer.from("30313233343536373839404142434445", "hex");

const treadmill = {
  heartRate: 0,
  miBandFound: function(peripheral) {
    console.log("miband found", peripheral);
    this.maintainConnection(peripheral);
  },
  maintainConnection: function(peripheral) {
    peripheral.on("disconnect", () => {
      console.log("disconnected");
    });

    // TODO: CONNECT SOMETIMES HANGS, NEED TO RETRY PROPERLY
    this.connectToDevice(peripheral);

    setInterval(() => {
      if (peripheral.state === "disconnected") {
        peripheral.disconnect();
        console.log("trying new connection");
        this.connectToDevice(peripheral);
      }
    }, 5000);
  },
  connectToDevice: function(peripheral) {
    peripheral.connect(error => {
      if (error) {
        console.log("error");
        console.log(error);
      } else {
        connected = true;
        console.log("connected");

        peripheral.discoverSomeServicesAndCharacteristics(
          [UUID_SERVICE_MIBAND_2], // Miband Special Service
          [UUID_BASE("0009")], // Heart Rate characteristic
          (error, services, characteristics) => {
            this.discoveredAuthentication(
              error,
              services,
              characteristics,
              peripheral
            );
          }
        );
      }
    });
  },
  discoveredAuthentication: function(
    error,
    services,
    characteristics,
    peripheral
  ) {
    console.log("discovered services & characteristics");

    if (error) {
      console.log("err2", error);
    }

    console.log(services);
    console.log(characteristics);
    const authChar = characteristics[0];

    if (authChar) {
      console.log("authChar found");
      authChar.on("data", data => {
        console.log("auth responded", data);
        this.handleAuthResponse(data, authChar, peripheral);
      });

      authChar.subscribe(err => {
        if (err) {
          console.log("error subscribing to heart rate characteristic");
        }

        console.log("subscribed");

        this.sendAuthHandshake(authChar);
      });
    }
  },
  sendAuthHandshake: function(authChar) {
    authChar.write(new Buffer.from("0208", "hex"), true);
  },
  sendEncryptedKey: function(encrypedKey, authChar) {
    const buffToWrite = new Buffer.from(
      "0308" + encrypedKey.toString("hex"),
      "hex"
    );
    console.log("buffer to write", buffToWrite);
    authChar.write(buffToWrite, true);
  },
  sendPlainKey: function(key, authChar) {
    authChar.write(new Buffer.from("0108" + key, "hex"), true);
  },
  listenToHeartRate: function(peripheral) {
    peripheral.discoverSomeServicesAndCharacteristics(
      ["180d"], // Heart Rate service
      [UUID_CHAR_HR_CONTROL_POINT, UUID_CHAR_HR_SUBSCRIBE], // Heart Rate characteristics
      this.discoveredHeartRateCharacteristics
    );
  },
  discoveredHeartRateCharacteristics: function(
    error,
    services,
    characteristics
  ) {
    console.log("discovered HR services & characteristics");

    if (error) {
      console.log("err hr disc", error);
    }

    console.log(services);
    console.log(characteristics);
    let hrControlPointChar;
    let hrSubscribeChar;

    characteristics.forEach(char => {
      console.log("a char", char);
      if (char.uuid === UUID_CHAR_HR_CONTROL_POINT) {
        console.log("control point found!");
        hrControlPointChar = char;
      } else if (char.uuid === UUID_CHAR_HR_SUBSCRIBE) {
        console.log("subscribtion char found!");
        hrSubscribeChar = char;
      }
    });
    console.log("THIS2", this);

    if (hrSubscribeChar) {
      hrSubscribeChar.on("data", data => {
        const heartRate = parseInt(data.toString("hex"), 16);

        console.log("HR: " + heartRate);
        console.log("THIS", this);
        this.setHeartRate(heartRate);
      });

      hrSubscribeChar.subscribe(err => {
        if (err) {
          console.log("error subscribing to heart rate characteristic");
        }
      });
    }

    // "Continuous heart rate"
    const continuousInterval = setInterval(() => {
      // TODO: Figure out how to have continuous heart rate that doesn't just stop.

      if (hrControlPointChar) {
        try {
          hrControlPointChar.write(new Buffer.from("150101", "hex"), false);
        } catch (e) {
          console.log(e);
          clearInterval(continuousInterval);
        }
      }
    }, 2000);
  },
  handleAuthResponse: function(response, authChar, peripheral) {
    const response2 = new Buffer.from(response);
    const cmd = response.slice(0, 3).toString("hex");
    console.log("cmd: ", cmd);
    if (cmd === "100101") {
      // Set New Key OK
      console.log("Set New Key OK");
      this.sendAuthHandshake();
    } else if (cmd === "100201") {
      // Req Random Number OK
      console.log("Req Random Number OK");
      console.log("response", response);
      console.log("response2", response2);
      let rdn = response2.slice(3);
      console.log("rdn", rdn);
      console.log("key", key);
      let cipher = crypto
        .createCipheriv("AES-128-ECB", key, "")
        .setAutoPadding(false);
      let encrypted = Buffer.concat([cipher.update(rdn), cipher.final()]);
      console.log("enc", encrypted);
      this.sendEncryptedKey(encrypted, authChar);
    } else if (cmd === "100301") {
      console.log("Authenticated");
      this.listenToHeartRate(peripheral);
    } else if (cmd === "100104") {
      // Set New Key FAIL
      console.log("Set New Key FAIL");
    } else if (cmd === "100204") {
      // Req Random Number FAIL
      console.log("Req Random Number FAIL");
    } else if (cmd === "100304") {
      console.log("Encryption Key Auth Fail, sending new key...");
      this.sendEncryptedKey(key, authChar);
    } else {
      console.log("Unhandled auth rsp:", response);
    }
  },
};

module.exports = treadmill;
