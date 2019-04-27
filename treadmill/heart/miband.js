const UUID_BASE = x => `0000${x}-0000-3512-2118-0009af100700`;
const UUID_SERVICE_MIBAND_2 = 0xfee1;

const treadmill = {
  miBandFound: peripheral => {
    console.log(peripheral);
    treadmill.startAuthentication(peripheral);
  },
  startAuthentication: peripheral => {
    peripheral.connect(error => {
      if (error) {
        console.log("error");
        console.log(error);
      }

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
      //   authChar.on("data", handleAuthResponse);
      authChar.on("data", data => {
        console.log("auth responded", data);
      });

      authChar.subscribe(err => {
        if (err) {
          console.log("error subscribing to heart rate characteristic");
        }

        treadmill.sendAuthHandshake(authChar);
      });
    }
  },
  sendAuthHandshake: authChar => {
    authChar.write(new Buffer.from("0x0208", "hex"), false);
  },
  handleAuthResponse: event => {
    if (event.target.uuid === this.char.auth.uuid) {
      const cmd = value.slice(0, 3).toString("hex");
      if (cmd === "100101") {
        // Set New Key OK
        this.authReqRandomKey();
      } else if (cmd === "100201") {
        // Req Random Number OK
        let rdn = value.slice(3);
        let cipher = crypto
          .createCipheriv("aes-128-ecb", this.key, "")
          .setAutoPadding(false);
        let encrypted = Buffer.concat([cipher.update(rdn), cipher.final()]);
        this.authSendEncKey(encrypted);
      } else if (cmd === "100301") {
        debug("Authenticated");
        this.emit("authenticated");
      } else if (cmd === "100104") {
        // Set New Key FAIL
        this.emit("error", "Key Sending failed");
      } else if (cmd === "100204") {
        // Req Random Number FAIL
        this.emit("error", "Key Sending failed");
      } else if (cmd === "100304") {
        debug("Encryption Key Auth Fail, sending new key...");
        this.authSendNewKey(this.key);
      } else {
        debug("Unhandled auth rsp:", value);
      }
    }
  }
};

module.exports = treadmill;
