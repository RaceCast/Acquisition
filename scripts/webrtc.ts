import { exec } from "child_process";
import findProcess from "find-process";

const command: string = process.argv[2];

const killProgram = () => {
  return new Promise((resolve): void => {
    exec("pkill -f firefox", (): void => {
      setTimeout(() => {
        return resolve(true);
      }, 1000);
    });
  });
};

const checkProgram = async (): Promise<unknown> => {
  return new Promise(async (resolve): Promise<void> => {
    const processes = await findProcess("name", "firefox");
    return resolve(processes.length > 0);
  });
};

const launchProgram = (): void => {
  exec(
    '/bin/su -c "export DISPLAY=:0 && xdg-open https://rallye.minarox.fr/broadcast.html" - coolpi',
  );
  setTimeout((): void => {
    checkProgram().then((running): void => {
      if (running) console.log("Firefox is running.");
      else console.log("Firefox is not running.");
    });
  }, 5000);
};

switch (command) {
  case "status":
    checkProgram().then((running): void => {
      if (running) console.log("Firefox is running.");
      else console.log("Firefox is not running.");
    });
    break;
  case "start":
    checkProgram().then((running): void => {
      if (running) {
        killProgram().then((): void => {
          launchProgram();
        });
      } else {
        launchProgram();
      }
    });
    break;
  case "restart":
    killProgram().then((): void => {
      launchProgram();
    });
    break;
  case "stop":
    killProgram().then((): void => {
      console.log("Firefox stopped successfully.");
    });
    break;
  default:
    console.log(
      "Invalid command. Usage: node webrtc.js [status|start|restart|stop]",
    );
    break;
}
