const { spawn } = require('child_process');
// Fetch Elgato usb device id with command: lsusb | grep 'Elgato'
const usbPath = `/sys/bus/usb/devices/8-1/authorized`;
const command = process.argv[2];

function toggle(boolean) {
    spawn('echo', [parseInt(boolean), '>', usbPath]);
}

switch (command) {
    // TODO: USB Status
    case 'on':
        toggle(true);
        console.log('done');
        break;
    case 'off':
        toggle(false);
        console.log('done');
        break;
    case 'restart':
        toggle(false);
        setTimeout(() => {
            toggle(true);
            console.log('done');
        }, 1000);
        break;
    default:
        console.log('Invalid command. Usage: node usb.js [on|off|restart]');
        break;
}
