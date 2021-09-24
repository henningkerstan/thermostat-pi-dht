# thermostat-pi-dht

A Node.js framework (standalone application + library) to control a heating system with a Raspberry Pi using DHT11 or DHT22/AM2302 sensors and GPIO actuators.

## Table of Contents

1. [Description](#1-description)
1. [Installation](#2-installation)
1. [Usage](#3-usage)
1. [Contributing](#4-contributing)
1. [Version History](#5-version-history)
1. [License](#6-license)

## 1. Description

This package contains a Node.js framework (standalone application + library) to control a heating system with a Raspberry Pi using DHT11 or DHT22/AM2302 sensors and GPIO actuators.

- The standalone application can be used to control a heating system and access its configuration via a simple, JSON-based web-API.
- The library can be used to implement the thermostat functionality in a larger application.

In both cases, multiple thermostats can be specified. Once activated, a thermostat regularly measures the current temperature (and relative humidity). It then activates or deactivates the actuator GPIO (which in turn should control the heating, e.g. by using a relay) by comparing the current temperature with the given setpoint:

- if the temperature is below the setpoint, it activates the actuator and
- if the temperature is equal to or above the setpoint, it deactivates the actuator.

### Common measuring loop

Note that this implementation uses a _common measuring loop_ for all configured thermostats, hence the sampling interval as well as the measurement timeout is configured globally.

### Power rail activation/deactivation

The implementation optionally supports a (common) _power rail activation/deactivation_: If a sensor power pin is specified, power to the DHT sensors will be switched on prior to a measurement and switched off after measurements finished (or timed out). The sensor warm-up time determines, how long (in seconds) the software will wait until starting a measurement after power has been activated.

### Heartbeat (LED) GPIO

The implementation also supports a (common) _heartbeat LED_: if a heartbeat pin is specified, the LED will be pulsed regularly to indicate that at least one thermostat is currently active.

## 2. Installation

This framework is available as a Node.js-module. You can thus use Node.js' package manager `npm` to install the latest production version from the [npm registry](https://npmjs.com). Depending on your use case, the installation method differs slightly. In both cases, however, you need to install the pigpio C library as follows (skip if you have installed it before):

```bash
sudo apt-get update
sudo apt-get install -y pigpio
```

### 2.1 Standalone application

For using the standalone application it is best to install the package globally by running the following command.

    sudo npm i -g thermostat-pi-dht

### 2.2 Library

For using the library in your own application install the package locally by running the following command

    sudo npm i thermostat-pi-dht

in your project's directory.

## 3. Usage

### 3.1 Standalone application

Once the package is installed, the standalone application `thermostat-pi-dht` requires a JSON configuration. The default location is `/etc/thermostat-pi-dht/config.json`. Here is an example for such a configuration file:

```JSON
{
  "host": "0.0.0.0",
  "port": 8000,
  "sensorWarmUpTime": 4,
  "samplingInterval": 60,
  "sensorPowerPin": 8,
  "heartbeatPin": 7,

  "thermostats": [
    { "name": "kitchen", "sensorPin": 24, "setpoint": 18 },
    { "name": "living-room", "sensorPin": 25, "actuatorPin": 11 },
    { "name": "bedroom", "sensorPin": 13, "actuatorPin": 17 },
  ]
}
```

The parameters `host` and `port` determine on which address(es) and port the web API will be available. In the example, `0.0.0.0` means that the program will listen to any request directed to the server on the specified port `8000`. For a detailed explanation of the other parameters have a look at the [online documentation of the Thermostat class](https://henningkerstan.github.io/thermostat-pi-dht/classes/Thermostat.Thermostat-1.html).

Once the configuration is created, you can start the application with

```
sudo thermostat-pi-dht
```

if you have used the default location or alternatively with

```
sudo thermostat-pi-dht /path/to/config.json
```

If the configuration file is ok, the program will start and you will be able to access the data via the web API. Let us assume that your program is running on a Raspberry Pi with IP address `192.168.1.123` and the above config. Then the measured thermostat data is available (as JSON data) at `http://192.168.1.123:8000/data.json`.

Finally, if this works and you want to use the standalone app as a service, create a systemd unit `/etc/systemd/system/thermostat-pi-dht.service` file with contents

```
[Unit]
Description=A Node.js app to control a heating system with a Raspberry Pi using DHT11 or DHT22/AM2302 sensors and GPIO actuators.

[Service]
Type=simple
ExecStart=/usr/local/bin/thermostat-pi-dht

[Install]
WantedBy=multi-user.target
```

then enable and start the service with

```
sudo systemctl enable thermostat-pi-dht
sudo systemctl start thermostat-pi-dht
```

and check with `sudo systemctl status thermostat-pi-dht` if this worked.

### 3.2 Use the library in your own application

Since this framework is written in TypeScript, you can use it both with TypeScript as well as with plain JavaScript. Below you can find short examples to get you started in both languages.

The library also comes with an online [documentation](https://henningkerstan.github.io/thermostat-pi-dht/). A good starting point for further reading is the [documentation of the Thermostat class](https://henningkerstan.github.io/thermostat-pi-dht/classes/Thermostat.Thermostat-1.html). Moreover, as this documentation is generated from source code comments using [TypeDoc](https://typedoc.org), a supported editor (like [Visual Studio Code](https://code.visualstudio.com/)) can provide on-the-fly information on functions, parameters, etc..

All major functionality is contained in the [Thermostat class](https://henningkerstan.github.io/thermostat-pi-dht/classes/Thermostat.Thermostat-1.html), hence you will most likely only need to import this class:

```typescript
import { Thermostat } from 'thermostat-pi-dht'
```

and then create an instance of that class for each thermostat you require. Have a look at the [source code of the standalone application](https://github.com/henningkerstan/thermostat-pi-dht/blob/main/src/thermostat-pi-dht.ts) and the [documentation of the Thermostat class](https://henningkerstan.github.io/thermostat-pi-dht/classes/Thermostat.Thermostat-1.html) to see how it works in detail.

## 4. Contributing

Contact the main author ([Henning Kerstan](https://henningkerstan.de)) if you want to contribute. More details will be available here soon.

This project uses [semantic versioning](https://semver.org/). However, despite most of the API being ready, note that since we are still in development (version 0.x.y), anything may yet change at any time.

For detailed information on the (minimal) required versions, have a look at the [package.json](https://github.com/henningkerstan/thermostat-pi-dht/blob/main/package.json).

## 5. Version history

As this library has not yet fully matured (version is still < 1.0.0), please have a look at the git commit log for a version history.

## 6. License

Copyright 2021 [Henning Kerstan](https://henningkerstan.de)

SPDX-License-Identifier: Apache-2.0
