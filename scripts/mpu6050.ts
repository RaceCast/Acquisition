import i2c from "i2c-bus";
import Mpu6050 from "i2c-mpu6050";

// Define interface
interface Data {
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
const address: number = 0x68;
const bus: number = i2c.openSync(1);
const mpu6050: Mpu6050 = new Mpu6050(bus, address);

// Limit all values to 2 decimals
function limitDecimals(data: Data): void {
  for (const key in data) {
    if (typeof data[key] === "object") limitDecimals(data[key]);
    else data[key] = parseFloat(data[key].toFixed(2));
  }
}

// Read sensor data
function readData(): void {
  // Read sensor data
  const data: Data = mpu6050.readSync();

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
  process.stdout.write(JSON.stringify(data));
}

setInterval(readData, 80);
