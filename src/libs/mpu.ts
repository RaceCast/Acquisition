import i2c from "i2c-bus";
import Mpu6050 from "i2c-mpu6050";

// Define interface
export interface MPU {
  gyro: {
    x: number;
    y: number;
    z?: number;
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
const temperatures: number[] = [];
let reverse: number;

// Limit all values to 2 decimals
function limitDecimals(data: MPU): void {
  for (const key in data) {
    if (typeof data[key] === "object") limitDecimals(data[key]);
    else data[key] = parseFloat(data[key].toFixed(2));
  }
}

// Smooth temperature values
function averageTemperature(newTemp: number): number {
  temperatures.push(newTemp);
  if (temperatures.length > 25) temperatures.shift();
  const sum: number = temperatures.reduce((a: number, b: number) => a + b, 0);
  const average: number = sum / temperatures.length;
  return parseFloat(average.toFixed(2));
}

// Read sensor data
function readData(): void {
  // Read sensor data
  const data: MPU = mpu6050.readSync();
  delete data.gyro.z;

  // Offset calibration
  data.accel.x -= 0.1062666015625;
  data.accel.y -= -0.02471844970703125;
  data.accel.z -= 0.0587399194335938;
  data.gyro.x -= -1.164820763358796;
  data.gyro.y -= 0.7862737404580179;
  data.rotation.x -= 1.3307699238968285;
  data.rotation.y -= -5.730089298597652;

  // Transform data
  limitDecimals(data);
  data.temp = averageTemperature(data.temp);

  // Invert gyro x and y
  reverse = data.gyro.x * -1;
  data.gyro.x = data.gyro.y;
  data.gyro.y = reverse;

  // Invert accel y and z
  reverse = data.accel.z * -1;
  data.accel.z = data.accel.y;
  data.accel.y = reverse;

  // Show data
  process.stdout.write(JSON.stringify(data));
}

setInterval(readData, 80);
