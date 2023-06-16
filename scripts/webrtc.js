const { exec, spawn} = require('child_process');
const findProcess = require('find-process');
const command = process.argv[2];

const killProgram = () => {
    return new Promise((resolve) => {
        exec('pkill -f firefox', () => {
            setTimeout(() => {
                return resolve(true);
            }, 1000);
        });
    });
};

const checkProgram = async () => {
    return new Promise(async (resolve) => {
        const processes = await findProcess('name', 'firefox');
        return resolve(processes.length > 0);
    });
};

const launchProgram = () => {
    exec('/bin/su -c "export DISPLAY=:0 && xdg-open https://rallye.minarox.fr/broadcast.html" - coolpi');
    setTimeout(() => {
        checkProgram().then((running) => {
            if (running) console.log('Firefox is running.');
            else console.log('Firefox is not running.');
        });
    }, 5000);
}

switch (command) {
    case 'status':
        checkProgram().then((running) => {
            if (running) console.log('Firefox is running.');
            else console.log('Firefox is not running.');
        });
        break;
    case 'start':
        checkProgram().then((running) => {
            if (running) {
                killProgram().then(() => {
                    launchProgram();
                });
            } else {
                launchProgram();
            }
        });
        break;
    case 'restart':
        killProgram().then(() => {
            launchProgram();
        });
        break;
    case 'stop':
        killProgram().then(() => {
            console.log('Firefox stopped successfully.');
        });
        break;
    default:
        console.log('Invalid command. Usage: node webrtc.js [status|start|restart|stop]');
        break;
}
