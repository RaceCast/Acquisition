const { spawn } = require('child_process');

let busy = false;
let interval = null;

function sendATCommand(command) {
    if (!busy) {
        busy = true;
        return new Promise((resolve) => {
            const socat = spawn('socat', ['- /dev/ttyUSB2'], {shell: true});
            let data = '';

            socat.stdout.on('data', (output) => {
                data += output.toString();
            });

            socat.on('close', () => {
                data = data.trim();

                // Le module renvoie une erreur
                if (data.startsWith('+CME ERROR: 505')) {
                    clearInterval(interval);
                    setTimeout(() => {
                        start();
                    }, 1500);
                }

                // Analyse de la réponse GPS du module EC25
                if (data.startsWith('+QGPSLOC:')) {
                    const dataElements = data.split(':')[1].split(',');
                    const latitude = parseFloat(dataElements[1].slice(0, 2)) + parseFloat(dataElements[1].slice(2)) / 60;
                    const longitude = parseFloat(dataElements[3].slice(0, 3)) + parseFloat(dataElements[3].slice(3)) / 60;

                    if (latitude && longitude) {
                        console.log(JSON.stringify({
                            latitude: latitude,
                            longitude: longitude,
                            altitude: parseFloat(dataElements[6]),
                            speed: parseFloat(dataElements[9]),
                        }));
                    }
                }
                busy = false;
                resolve(data);
            });

            socat.stdin.write(`${command}\r\n`);
            socat.stdin.end();
        });
    }
}

function start() {
    sendATCommand('AT+QGPSEND').then(() => {
        sendATCommand("AT+COPS=2").then(() => {
            sendATCommand('AT+QGPS=1').then(() => {
                sendATCommand('AT+QGPSCFG="nmeasrc",1').then(() => {
                    sendATCommand('AT+QGPSGNMEA="GGA",1').then(() => {
                        sendATCommand('AT+QGPSLOC=1');
                        interval = setInterval(() => {
                            sendATCommand('AT+QGPSLOC=1');
                        }, 1000);
                    });
                });
            });
        });
    });
}

start();
