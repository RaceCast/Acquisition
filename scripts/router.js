const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline')
let interval = null;

const port = new SerialPort({
    path: '/dev/ttyUSB2', // Chemin du port série
    baudRate: 115200, // Vitesse de communication du port série, ajustez-la si nécessaire
});

const parser = port.pipe(new ReadlineParser({delimiter: '\r\n'}));

// Écoute des données reçues depuis le port série
parser.on('data', (line) => {
    // Le module renvoie une erreur
    if (line.startsWith('+CME ERROR: 505')) {
        clearInterval(interval);
        setTimeout(() => {
            start();
        }, 1000);
    }

    // Analyse de la réponse GPS du module EC25
    if (line.startsWith('+QGPSLOC:')) {
        // Récupération de la latitude et de la longitude
        const dataElements = line.split(':')[1].split(',');
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
});

const start = () => {
    // Réactive le module GPS
    setTimeout(() => {
        port.write('AT+QGPSEND\r\n'); // Désactive le module GPS
    }, 250);
    setTimeout(() => {
        port.write('AT+QGPS=1\r\n'); // Active le module GPS
    }, 250);

    // Configuration du module GPS
    setTimeout(() => {
        port.write('AT+QGPSCFG="nmeasrc",1\r\n'); // Configuration de la source NMEA
    }, 250);
    setTimeout(() => {
        port.write('AT+QGPSGNMEA="GGA",1\r\n'); // Active la sortie NMEA GGA
    }, 250);

    // Demande les données GPS
    setTimeout(() => {
        port.write('AT+QGPSLOC=1\r\n');
        interval = setInterval(() => {
            port.write('AT+QGPSLOC=1\r\n');
        }, 1000);
    }, 1250);
};

start();
