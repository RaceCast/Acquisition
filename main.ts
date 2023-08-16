import { config } from "dotenv";
import { spawn } from "node:child_process";
import { io } from "socket.io-client";

config({ path: `${__dirname}/.env` });

// --- Initialization ---
// Check if auth key is defined
if (!process.env.AUTH_KEY) {
  process.stderr.write("ERROR: No auth key defined in .env file");
  process.exit(1);
}

// Init socket.io
const socket = io(`https://rallye.minarox.fr?key=${process.env.AUTH_KEY}`, {
  reconnectionDelay: 2000,
  reconnectionDelayMax: 2000,
  timeout: 2000,
  retries: Infinity,
});

// Define interfaces
interface State {
  online: boolean;
  mpu6050: boolean;
}

interface Mpu6050 {
  gyro: {
    x: number;
    y: number;
    z: number;
  };
  accel: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
  };
  temp: number;
}

// Define global variables
// let firefox: boolean = false;
const state: State = {
  online: false,
  mpu6050: false,
};

// --- Interface and events ---
// Update console status
function updateConsoleStatus(erase: boolean = true): void {
  if (erase) {
    for (let i = 0; i <= 2; i++) {
      const y = i === 0 ? null : -1;
      process.stdout.moveCursor(0, y);
      process.stdout.clearLine(1);
    }
    process.stdout.cursorTo(0);
  }
  process.stdout.write(
    `Back-End: ${
      state.online
        ? `\x1b[32mOnline\x1b[89m\x1b[0m`
        : `\x1b[31mOffline\x1b[89m\x1b[0m`
    }\r\n`,
  );
  process.stdout.write(
    `MPU6050: ${
      state.mpu6050
        ? `\x1b[32mOnline\x1b[89m\x1b[0m`
        : `\x1b[31mOffline\x1b[89m\x1b[0m`
    }\r\n`,
  );
}

// Socket.io events
socket.on("connect", () => {
  state.online = true;
  updateConsoleStatus();

  // Run scripts
  setTimeout(() => {
    if (!state.mpu6050) runMpu6050();
  }, 300);

  socket.on("disconnect", () => {
    state.online = false;
    updateConsoleStatus();
  });

  socket.on("latency", (callback) => {
    callback(Date.now());
  });

  socket.emit("state", state);

  // if (!firefox) {
  //    firefox = true;
  //   spawn("node", ["scripts/webrtc.js", "restart"]);
  // }
});

// Script execution
function runMpu6050(): void {
  const sensor = spawn("node", ["scripts/mpu6050.js"], { stdio: "pipe" });

  // Update status when the script is ready
  sensor.on("spawn", () => {
    state.mpu6050 = true;
    updateConsoleStatus();
    socket.volatile.emit("state", state);
  });

  // Send data to the backend
  sensor.stdout.on("data", (data: string) => {
    const values: Mpu6050 = JSON.parse(data.toString().trim());
    if (state.online) socket.volatile.emit("mpu6050", values);
  });

  // Restart the script if it crashes or exits
  ["exit", "error"].forEach((type: string) => {
    sensor.on(type, () => {
      state.mpu6050 = false;
      updateConsoleStatus();
      socket.volatile.emit("state", state);
      setTimeout(() => {
        runMpu6050();
      }, 2000);
    });
  });
}

/*function runRouter() {
  // Exécution du script
  const router = spawn("node", ["scripts/gps.js"], { stdio: "pipe" });

  // Capturer la sortie du script
  router.stdout.on("data", (data) => {
    const values = JSON.parse(data.toString().trim());
    if (connected) socket.volatile.emit("gps", values);
  });

  // Gestion de la fin du processus
  router.on("exit", () => {
    setTimeout(() => {
      runRouter();
    }, 1000);
  });
}*/

/*function runStream() {
    // Exécution du script
    const stream = spawn('node', ['scripts/stream.js'], { stdio: 'pipe' });

    // Capturer la sortie du script
    stream.stdout.on('data', (data) => {
        console.log(`Stream - ${data.toString().trim()}`);
        // Create WebRTC connection
    });

    // Gestion de la fin du processus
    stream.on('exit', () => {
        setTimeout(() => {
            runStream();
        }, 1000);
    });
}*/

updateConsoleStatus(false);

// restartSensor();
// runRouter();
// runStream();
