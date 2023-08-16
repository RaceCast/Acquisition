import { config } from "dotenv";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { io, Socket } from "socket.io-client";

config({ path: `${__dirname}/.env` });

// --- Initialization ---
// Check if auth key is defined
if (!process.env.AUTH_KEY) {
  process.stderr.write("ERROR: No auth key defined in .env file");
  process.exit(1);
}

// Init socket.io
const socket: Socket = io(
  `https://rallye.minarox.fr?key=${process.env.AUTH_KEY}`,
  {
    reconnectionDelay: 2000,
    reconnectionDelayMax: 2000,
    timeout: 2000,
    retries: Infinity,
  },
);

// Define interfaces
interface State {
  online: boolean;
  mpu6050: boolean;
  gps: boolean;
  webrtc: boolean;
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

interface Gps {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
}

// Define global variables
const state: State = {
  online: false,
  mpu6050: false,
  gps: false,
  webrtc: false,
};

// --- Interface and events ---
// Update console status
function updateConsoleStatus(erase: boolean = true): void {
  if (process.stdout.isTTY) {
    if (erase) {
      for (let i: number = 0; i <= 4; i++) {
        const y: number | null = i === 0 ? null : -1;
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
    process.stdout.write(
      `GPS: ${
        state.gps
          ? `\x1b[32mOnline\x1b[89m\x1b[0m`
          : `\x1b[31mOffline\x1b[89m\x1b[0m`
      }\r\n`,
    );
    process.stdout.write(
      `WebRTC: ${
        state.webrtc
          ? `\x1b[32mOnline\x1b[89m\x1b[0m`
          : `\x1b[31mOffline\x1b[89m\x1b[0m`
      }\r\n`,
    );
  }
}

// Socket.io events
socket.on("connect", (): void => {
  state.online = true;
  updateConsoleStatus();

  // Run scripts
  setTimeout((): void => {
    if (!state.mpu6050) runMpu6050();
  }, 300);
  setTimeout((): void => {
    if (!state.gps) runGps();
  }, 600);
  setTimeout((): void => {
    if (!state.webrtc) runWebrtc();
  }, 900);

  socket.on("disconnect", (): void => {
    state.online = false;
    updateConsoleStatus();
  });

  socket.on("latency", (callback): void => {
    callback(Date.now());
  });

  socket.emit("state", state);
});

// Script execution
function runMpu6050(): void {
  // Run the script
  const process: ChildProcessWithoutNullStreams = spawn(
    "node",
    ["scripts/mpu6050.js"],
    { stdio: "pipe" },
  );

  // Send data to the backend
  process.stdout.on("data", (data: string): void => {
    if (!state.mpu6050) {
      state.mpu6050 = true;
      updateConsoleStatus();
      socket.volatile.emit("state", state);
    }
    const values: Mpu6050 = JSON.parse(data);
    if (state.online) socket.volatile.emit("mpu6050", values);
  });

  // Restart the script if it crashes or exits
  ["exit", "error"].forEach((type: string): void => {
    process.on(type, (): void => {
      state.mpu6050 = false;
      updateConsoleStatus();
      socket.volatile.emit("state", state);
      setTimeout((): void => {
        runMpu6050();
      }, 2000);
    });
  });
}

function runGps(): void {
  // Run the script
  const process: ChildProcessWithoutNullStreams = spawn(
    "node",
    ["scripts/gps.js"],
    { stdio: "pipe" },
  );

  // Send data to the backend
  process.stdout.on("data", (data: string): void => {
    if (!state.gps) {
      state.gps = true;
      updateConsoleStatus();
      socket.volatile.emit("state", state);
    }
    const values: Gps = JSON.parse(data);
    if (state.online) socket.volatile.emit("gps", values);
  });

  // Restart the script if it crashes or exits
  ["exit", "error"].forEach((type: string): void => {
    process.on(type, (): void => {
      state.gps = false;
      updateConsoleStatus();
      socket.volatile.emit("state", state);
      setTimeout((): void => {
        runGps();
      }, 2000);
    });
  });
}

function runWebrtc(): void {
  // Run the script
  const process: ChildProcessWithoutNullStreams = spawn("node", [
    "scripts/webrtc.js",
    "restart",
  ]);

  process.on("spawn", (): void => {
    state.webrtc = true;
    updateConsoleStatus();
    socket.volatile.emit("state", state);
  });

  ["exit", "error"].forEach((type: string): void => {
    process.on(type, (): void => {
      state.webrtc = false;
      updateConsoleStatus();
      socket.volatile.emit("state", state);
    });
  });
}

updateConsoleStatus(false);
