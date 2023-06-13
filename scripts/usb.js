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
    // TODO: USB Status
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
        console.log('Invalid command. Usage: node usb.js [on|off|restart]');
        break;
}

if (!prevent) done();
