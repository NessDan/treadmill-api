const UUID_BASE = x => `0000${x}0000351221180009af100700`;
const UUID_SERVICE_MIBAND_2 = "fee1";
const UUID_CHAR_HR_CONTROL_POINT = "2a39";
const UUID_CHAR_HR_SUBSCRIBE = "2a37";
const crypto = require("crypto");

// TODO: this is constant for now, but should random and managed per-device
const key = new Buffer.from("30313233343536373839404142434445", "hex");

const treadmill = {
  miBandFound: peripheral => {
    console.log("miband found", peripheral);
    treadmill.connectToDevice(peripheral);
  },
  connectToDevice: peripheral => {
    peripheral.once("disconnect", () => {
      console.log("disconnected");
      connected = false;
    });

    let connected = false;
    // TODO: CONNECT SOMETIMES HANGS, NEED TO RETRY
    const attemptConnection = () => {
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
              treadmill.discoveredAuthentication(
                error,
                services,
                characteristics,
                peripheral
              );
            }
          );
        }
      });
    };

    attemptConnection();

    setInterval(() => {
      if (!connected) {
        attemptConnection();
      }
    }, 3000);
  },
  discoveredAuthentication: (error, services, characteristics, peripheral) => {
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
        treadmill.handleAuthResponse(data, authChar, peripheral);
      });

      authChar.subscribe(err => {
        if (err) {
          console.log("error subscribing to heart rate characteristic");
        }

        console.log("subscribed");

        treadmill.sendAuthHandshake(authChar);
      });
    }
  },
  sendAuthHandshake: authChar => {
    authChar.write(new Buffer.from("0208", "hex"), true);
  },
  sendEncryptedKey: (encrypedKey, authChar) => {
    const buffToWrite = new Buffer.from(
      "0308" + encrypedKey.toString("hex"),
      "hex"
    );
    console.log("buffer to write", buffToWrite);
    authChar.write(buffToWrite, true);
  },
  sendPlainKey: (key, authChar) => {
    authChar.write(new Buffer.from("0108" + key, "hex"), true);
  },
  listenToHeartRate: peripheral => {
    peripheral.discoverSomeServicesAndCharacteristics(
      ["180d"], // Heart Rate service
      [UUID_CHAR_HR_CONTROL_POINT, UUID_CHAR_HR_SUBSCRIBE], // Heart Rate characteristics
      treadmill.discoveredHeartRateCharacteristics
    );
  },
  discoveredHeartRateCharacteristics: (error, services, characteristics) => {
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

    hrSubscribeChar.on("data", data => {
      const heartRate = parseInt(data.toString("hex"), 16);

      console.log("HR: " + heartRate);

      // TODO: Figure out if this is how your supposed to keep conneciton active.
      if (heartRate) {
        // We got a heart rate back, send another
        hrControlPointChar.write(new Buffer.from("150101", "hex"), false);
      }

      treadmill.setHeartRate(heartRate);
    });

    hrSubscribeChar.subscribe(err => {
      if (err) {
        console.log("error subscribing to heart rate characteristic");
      }
    });

    // Continuous heart rate
    hrControlPointChar.write(new Buffer.from("150101", "hex"), false);
  },
  handleAuthResponse: (response, authChar, peripheral) => {
    const response2 = new Buffer.from(response);
    const cmd = response.slice(0, 3).toString("hex");
    console.log("cmd: ", cmd);
    if (cmd === "100101") {
      // Set New Key OK
      console.log("Set New Key OK");
      treadmill.sendAuthHandshake();
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
      treadmill.sendEncryptedKey(encrypted, authChar);
    } else if (cmd === "100301") {
      console.log("Authenticated");
      treadmill.listenToHeartRate(peripheral);
    } else if (cmd === "100104") {
      // Set New Key FAIL
      console.log("Set New Key FAIL");
    } else if (cmd === "100204") {
      // Req Random Number FAIL
      console.log("Req Random Number FAIL");
    } else if (cmd === "100304") {
      console.log("Encryption Key Auth Fail, sending new key...");
      treadmill.sendEncryptedKey(key, authChar);
    } else {
      console.log("Unhandled auth rsp:", response);
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
