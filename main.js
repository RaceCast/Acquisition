require("dotenv").config({ path: `${__dirname}/.env` });

const { execFile, spawn } = require('node:child_process');
const io = require('socket.io-client');

let connected = false;
let interval = null;

// Init socket.io
const socket = io(`https://rallye.minarox.fr?key=${process.env.AUTH_KEY}`, {
    reconnectionDelay: 2000,
    reconnectionDelayMax: 2000,
    timeout: 2000,
    retries: Infinity,
});

socket.on("connect", () => {
    console.log(`Connected to server (${new Date().toLocaleString()})`);
    connected = true;

    // Send timestamp to server
    interval = setInterval(() => {
        if (connected) socket.volatile.emit("latency", Date.now());
    }, 500);
});

socket.on("disconnect", () => {
    console.log(`Disconected from server (${new Date().toLocaleString()})`);
    connected = false;
    clearInterval(interval);
});

function runSensor() {
    // Exécution du script
    const sensor = spawn('node', ['scripts/sensor.js'], { stdio: 'pipe' });

    // Capturer la sortie du script
    sensor.stdout.on('data', (data) => {
        const values = JSON.parse(data.toString().trim());
        if (connected) socket.volatile.emit('mpu6050', values);
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
    const router = spawn('node', ['scripts/gps.js'], { stdio: 'pipe' });

    // Capturer la sortie du script
    router.stdout.on('data', (data) => {
        const values = JSON.parse(data.toString().trim());
        if (connected) socket.volatile.emit('gps', values);
    });

    // Gestion de la fin du processus
    router.on('exit', () => {
        setTimeout(() => {
            runRouter();
        }, 1000);
    });
}

function runStream() {
    // Exécution du script
    const stream = spawn('node', ['scripts/stream.js'], { stdio: 'pipe' });

    // Capturer la sortie du script
    stream.stdout.on('data', (data) => {
        console.log(data.toString().trim());
        // if (connected) socket.emit('stream', data);
    });

    // Gestion de la fin du processus
    stream.on('exit', () => {
        setTimeout(() => {
            runStream();
        }, 1000);
    });
}

runSensor();
runRouter();
runStream();
