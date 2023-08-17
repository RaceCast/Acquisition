import { config } from "dotenv";
import {
  ChildProcessWithoutNullStreams,
  exec,
  spawn,
} from "node:child_process";
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

interface Processes {
  exit: boolean;
  mpu6050: ChildProcessWithoutNullStreams | null;
  gps: ChildProcessWithoutNullStreams | null;
  webrtc: ChildProcessWithoutNullStreams | null;
}

// Define global variables
const state: State = {
  online: false,
  mpu6050: false,
  gps: false,
  webrtc: false,
};
const processes: Processes = {
  exit: false,
  mpu6050: null,
  gps: null,
  webrtc: null,
};

// --- Interface and events ---
// Clear console
function clearConsole(): void {
  for (let i: number = 0; i <= 4; i++) {
    const y: number | null = i === 0 ? null : -1;
    process.stdout.moveCursor(0, y);
    process.stdout.clearLine(1);
  }
  process.stdout.cursorTo(0);
}

// Update console status
function updateConsoleStatus(erase: boolean = true): void {
  if (process.stdout.isTTY || !processes.exit) {
    if (erase) clearConsole();
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

// Run MPU6050 script
function runMpu6050(): void {
  // Run the script
  processes.mpu6050 = spawn("node", ["scripts/mpu6050.js"], { stdio: "pipe" });

  // Send data to the backend
  processes.mpu6050.stdout.on("data", (data: string): void => {
    if (!state.mpu6050) {
      state.mpu6050 = true;
      updateConsoleStatus();
      socket.emit("state", state);
    }
    const values: Mpu6050 = JSON.parse(data);
    if (state.online) socket.volatile.emit("mpu6050", values);
  });

  // Restart the script if it crashes or exits
  ["exit", "error"].forEach((type: string): void => {
    processes.mpu6050.on(type, (): void => {
      state.mpu6050 = false;
      updateConsoleStatus();
      socket.emit("state", state);
      processes.mpu6050 = null;
      if (!processes.exit) {
        setTimeout((): void => {
          runMpu6050();
        }, 2000);
      }
    });
  });
}

// Run GPS script
function runGps(): void {
  // Run the script
  processes.gps = spawn("node", ["scripts/gps.js"], { stdio: "pipe" });

  // Send data to the backend
  processes.gps.stdout.on("data", (data: string): void => {
    if (!state.gps) {
      state.gps = true;
      updateConsoleStatus();
      socket.emit("state", state);
    }
    const values: Gps = JSON.parse(data);
    if (state.online) socket.volatile.emit("gps", values);
  });

  // Restart the script if it crashes or exits
  ["exit", "error"].forEach((type: string): void => {
    processes.gps.on(type, (): void => {
      state.gps = false;
      updateConsoleStatus();
      socket.emit("state", state);
      processes.gps = null;
      if (!processes.exit) {
        setTimeout((): void => {
          runGps();
        }, 2000);
      }
    });
  });
}

// Run WebRTC script
function runWebrtc(): void {
  // Run the script
  processes.webrtc = spawn("node", ["scripts/webrtc.js", "restart"]);

  processes.webrtc.on("spawn", (): void => {
    state.webrtc = true;
    updateConsoleStatus();
    socket.emit("state", state);
  });

  ["exit", "error"].forEach((type: string): void => {
    processes.webrtc.on(type, (): void => {
      state.webrtc = false;
      updateConsoleStatus();
      processes.webrtc = null;
      socket.emit("state", state);
    });
  });
}

// Cleanup
function cleanup(): void {
  processes.exit = true;

  // Exit message
  if (process.stdout.isTTY) {
    clearConsole();
    process.stdout.write("Clear processes and exiting...\r\n");
  }

  // Kill processes
  if (processes.mpu6050) processes.mpu6050.kill();
  if (processes.gps) {
    processes.gps.kill();
    exec("sudo mmcli -m 0 --command='AT+QGPSEND'");
  }
  if (processes.webrtc) {
    processes.webrtc.kill();
    spawn("node", ["scripts/webrtc.js", "stop"]);
  }

  // Disconnect socket
  socket.disconnect();

  // Exit
  process.exit();
}

// Cleanup on exit
["exit", "SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException"].forEach(
  (type: string): void => {
    process.on(type, cleanup);
  },
);

updateConsoleStatus(false);
