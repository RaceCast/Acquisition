require("dotenv").config({ path: `${__dirname}/.env` });
const { execFile, spawn } = require('node:child_process');
const io = require('socket.io-client');
let connected = false;
let interval = null;

// Init socket.io
const socket = io(`https://rallye.minarox.fr?key=${process.env.AUTH_KEY}`, {
    reconnectionDelay: 300,
    reconnectionDelayMax: 300,
    timeout: 300,
    retries: Infinity,
});

socket.on("connect", () => {
    connected = true;

    // Send timestamp to server
    interval = setInterval(() => {
        socket.volatile.emit("latency", Date.now());
    }, 500);
});

socket.on("disconnect", () => {
    connected = false;
    clearInterval(interval);
});

function runSensor() {
    // Exécution du script
    const sensor = spawn('node', ['scripts/sensor.js'], { stdio: 'pipe' });

    // Capturer la sortie du script
    sensor.stdout.on('data', (data) => {
        const values = JSON.parse(data.toString());
        if (connected) {
            socket.volatile.emit('mpu6050', values);
        }
        // console.log(values);
    });

    // Gestion de la fin du processus
    sensor.on('exit', () => {
        setTimeout(() => {
            runSensor();
        }, 1000);
    });
}

function runRouter() {
    // Exécution du script
    const router = spawn('node', ['scripts/router.js'], { stdio: 'pipe' });

    // Capturer la sortie du script
    router.stdout.on('data', (data) => {
        const values = JSON.parse(data.toString());
        if (connected) {
            socket.volatile.emit('gps', values);
        }
        // console.log(values);
    });

    // Gestion de la fin du processus
    router.on('exit', () => {
        setTimeout(() => {
            runRouter();
        }, 1000);
    });
}

runSensor();
runRouter();
