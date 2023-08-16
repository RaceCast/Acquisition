import { exec, ExecException } from "child_process";

let skip: boolean = true;

function checkState(): void {
  skip = true;

  // Check GPS state
  exec(
    "sudo mmcli -m 0 --command='AT+QGPS?'",
    (error: ExecException, stdout: string): void => {
      if (error) {
        // Relaunch the script
        setTimeout(checkState, 1000);
      } else if (stdout.trim().startsWith("response: '+QGPS: 1'")) {
        // Disable GPS
        setTimeout((): void => {
          exec(
            "sudo mmcli -m 0 --command='AT+QGPSEND'",
            (error: ExecException): void => {
              if (error) {
                // Relaunch the script
                setTimeout(checkState, 1000);
              } else {
                // Init GPS
                setTimeout(initGPS, 1000);
              }
            },
          );
        }, 1000);
      } else {
        // Init GPS
        setTimeout(initGPS, 1000);
      }
    },
  );
}

function initGPS(): void {
  // Set GPS format
  exec(
    "sudo mmcli -m 0 --command='AT+QGPSCFG=\"nmeasrc\",1'",
    (error: ExecException): void => {
      if (error) {
        // Relaunch the script
        setTimeout(checkState, 1000);
      } else {
        // Enable GPS
        setTimeout((): void => {
          exec(
            "sudo mmcli -m 0 --command='AT+QGPS=1'",
            (error: ExecException): void => {
              if (error) {
                // Relaunch the script
                setTimeout(checkState, 1000);
              } else {
                // Get GPS location
                setInterval(getPosition, 1000);
              }
            },
          );
        }, 1000);
      }
    },
  );
}

function getPosition(): void {
  // Get GPS location
  exec(
    "sudo mmcli -m 0 --command='AT+QGPSLOC=1'",
    (_error: ExecException, stdout: string): void => {
      if (skip) {
        skip = false;
      } else {
        if (stdout.trim().startsWith("response: '+QGPSLOC:")) {
          const data: string[] = stdout.trim().split(":")[2].trim().split(",");
          const latitude: number =
            parseFloat(data[1].slice(0, 2)) + parseFloat(data[1].slice(2)) / 60;
          const longitude: number =
            parseFloat(data[3].slice(0, 3)) + parseFloat(data[3].slice(3)) / 60;

          if (latitude && longitude) {
            process.stdout.write(
              JSON.stringify({
                latitude: latitude,
                longitude: longitude,
                altitude: parseFloat(data[6]),
                speed: parseFloat(data[9]),
              }),
            );
          }
        }
      }
    },
  );
}

checkState();
