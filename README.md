<div id="top"></div>
<br />

<div align="center">
<a href="https://github.com/RaceCar/Acquisition">
    <img src="https://avatars.githubusercontent.com/u/134273283?s=80" alt="Logo" width="auto" height="80" style="border-radius: 8px">
</a>

<h3 align="center">Acquisition</h3>

![Project Version](https://img.shields.io/github/package-json/v/RaceCast/Acquisition?label=Version)&nbsp;
![Project License](https://img.shields.io/github/license/RaceCast/Acquisition?label=Licence)

  <p align="center">
    NodeJS scripts for on-board system data acquisition.
    <br />
    <a href="https://rallye.minarox.fr/"><strong>rallye.minarox.fr »</strong></a>
  </p>
</div>
<br />

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#features">Features</a></li>
        <li><a href="#tech-stack">Tech Stack</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#start-development-server">Start development server</a></li>
        <li><a href="#serve-user-interface">Serve user interface</a></li>
        <li><a href="#deploy">Deploy</a></li>
      </ul>
    </li>
    <li><a href="#author">Author</a></li>
  </ol>
</details>

## About The Project

NodeJS scripts for acquiring and transmitting data from the various sensors mounted on the embedded system.

### Features

- Collects and processes data from the MPU6050 sensor
- Collects and processes data from the GPS sensor
- Send data from the embedded system to the [API](https://github.com/RaceCast/API):
    - MPU6050 data (accelerometer, gyroscope, rotation, temperature)
    - GPS data (latitude, longitude, altitude, speed)
    - Latency value between the embedded system and the API

### Tech Stack

- [NodeJS](https://nodejs.org/)
  - [Socket.io](https://socket.io/)
  - [i2c-bus](https://www.npmjs.com/package/i2c-bus)
  - [i2c-mpu6050](https://www.npmjs.com/package/i2c-mpu6050)

<p align="right">(<a href="#top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Install [NodeJS](https://nodejs.org/) with [npm](https://www.npmjs.com/)

```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
```

- Create a `.env` file at the root of the project to set embedded system authentication key for the [API](https://github.com/RaceCast/API)

````env
  AUTH_KEY="your-auth-key"
````

### Tests scripts

- Install dependencies

````bash
  npm install
````

- Start node development server

````bash
  nodemon main.js
  # or
  nodemon scripts/file.js # Replace file.js by the script you want to test
````

### Deploy on embedded system

- Start main script

````bash
  node main.js
````

The script will automatically fetch and send data from the sensors to the API.

<p align="right">(<a href="#top">back to top</a>)</p>

## Author

[@Minarox](https://www.github.com/Minarox)

<p align="right">(<a href="#top">back to top</a>)</p>
