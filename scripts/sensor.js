const i2c = require('i2c-bus');
const MPU6050 = require('i2c-mpu6050');

// Init I2C bus with MPU6050 address
const address = 0x68;
const i2c1 = i2c.openSync(1);

// Init MPU6050
const sensor = new MPU6050(i2c1, address);

// Limit all values to 2 decimals
function limitDecimals (obj) {
    for (const key in obj) {
        if (typeof obj[key] === "object") limitDecimals(obj[key]);
        else obj[key] = parseFloat(obj[key].toFixed(2));
    }
}

// Read sensor data
function readData() {
    // Read sensor data
    const data = sensor.readSync();

    // Offset calibration
    data.accel.x -= 0.058978759765625;
    data.accel.y -= 0.0088987060546875;
    data.accel.z -= 0.059643090820312494;
    data.gyro.x -= -0.7022061068702323;
    data.gyro.y -= 1.0760305343511471;
    data.rotation.x -= -0.4804232806148877;
    data.rotation.y -= -3.1856752923673435;

    // Show data
    limitDecimals(data);
    console.log(JSON.stringify(data));
}

setInterval(readData, 80);
