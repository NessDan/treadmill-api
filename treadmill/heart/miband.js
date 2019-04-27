const UUID_BASE = x => `0000${x}0000351221180009af100700`;
const UUID_SERVICE_MIBAND_2 = "fee1";
const crypto = require("crypto");

// TODO: this is constant for now, but should random and managed per-device
const key = new Buffer.from("30313233343536373839404142434445", "hex");

const treadmill = {
  miBandFound: peripheral => {
    console.log("miband found", peripheral);
    treadmill.startAuthentication(peripheral);
  },
  startAuthentication: peripheral => {
    // TODO: CONNECT SOMETIMES HANGS, NEED TO RETRY
    peripheral.connect(error => {
      if (error) {
        console.log("error");
        console.log(error);
      }
      console.log("connected");

      peripheral.discoverSomeServicesAndCharacteristics(
        [UUID_SERVICE_MIBAND_2], // Miband Special Service
        [UUID_BASE("0009")], // Heart Rate characteristic
        treadmill.discoveredAuthentication
      );
    });
  },
  discoveredAuthentication: (error, services, characteristics) => {
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
        treadmill.handleAuthResponse(data, authChar);
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
    authChar.write(new Buffer.from("0108" + encrypedKey, "hex"), true);
  },
  handleAuthResponse: (response, authChar) => {
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
      let rdn = response2.slice(3);
      console.log(rdn);
      let cipher = crypto
        .createCipheriv("AES-128-ECB", key, "")
        .setAutoPadding(false);
      let encrypted = Buffer.concat([cipher.update(rdn), cipher.final()]);
      treadmill.sendEncryptedKey(encrypted, authChar);
    } else if (cmd === "100301") {
      console.log("Authenticated");
      this.emit("authenticated");
    } else if (cmd === "100104") {
      // Set New Key FAIL
      console.log("Set New Key FAIL");
      this.emit("error", "Key Sending failed");
    } else if (cmd === "100204") {
      // Req Random Number FAIL
      console.log("Req Random Number FAIL");
      this.emit("error", "Key Sending failed");
    } else if (cmd === "100304") {
      console.log("Encryption Key Auth Fail, sending new key...");
      treadmill.sendEncryptedKey(key);
    } else {
      console.log("Unhandled auth rsp:", response);
    }
  }
};

module.exports = treadmill;
