const { spawn } = require('child_process');
// Fetch Elgato usb device id with command: lsusb | grep 'Elgato'
const usbPath = `/sys/bus/usb/devices/8-1/authorized`;
const command = process.argv[2];
let prevent = false;

function toggle(boolean) {
    spawn('echo', [parseInt(boolean), '>', usbPath]);
}

function done() {
    setTimeout(() => {
        console.log('done');
    }, 1500);
}

switch (command) {
    case 'status':
        prevent = true;
        const lsusb = spawn('lsusb', ['|', 'grep', 'Elgato']);
        let data = '';

        lsusb.stdout.on('data', (output) => {
            data += output.toString();
        });

        lsusb.on('close', () => {
            if (data.trim()) console.log('connected');
            else console.log('disconnected');
        });
        break;
    case 'on':
        toggle(true);
        break;
    case 'off':
        toggle(false);
        break;
    case 'restart':
        prevent = true;
        toggle(false);
        setTimeout(() => {
            toggle(true);
            done();
        }, 1000);
        break;
    default:
        console.log('Invalid command. Usage: node usb.js [status|on|off|restart]');
        break;
}

if (!prevent) done();
