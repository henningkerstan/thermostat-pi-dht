# thermostat-pi-dht
A library to control a heating system with a Raspberry Pi using DHT11 or DHT22/AM3202 sensors and GPIO actuators. 


## Table of Contents
1. [Description](#1-description)
1. [Installation](#2-installation)
1. [Usage](#3-usage)
1. [Contributing](#4-contributing)
1. [Version History](#5-version-history)
1. [License](#6-license)


## 1. Description 
Tbd

## 2. Installation
This library is available as a Node.js-module. You can thus use Node.js' package manager `npm` to install the latest production version from the [npm registry](https://npmjs.com) by executing

    npm i thermostat-pi-dht

in your Node.js project's repository. This will automatically also install the following dependencies.

Name | Description | License
---|---|---
[pigpio](https://www.npmjs.com/package/pigpio) | A Node.js wrapper for the pigpio C library. | [MIT](https://github.com/fivdi/pigpio/blob/master/LICENSE)
[pigpio-dht](https://www.npmjs.com/package/pigpio-dht) | A Node.js implementation for DHT11 and DHT22/AM2302 sensor using pigpio. | ISC 

## 3. Usage
Since this framework is written in TypeScript, you can use it both with TypeScript as well as with plain JavaScript. Below you can find short examples to get you started in both languages. 

The library also comes with an online [documentation](https://henningkerstan.github.io/thermostat-pi-dht/). A good starting point for further reading is the [documentation of the Thermostat class](https://henningkerstan.github.io/thermostat-pi-dht/classes/Thermostat.Thermostat-1.html). Moreover, as this documentation is generated from source code comments using [TypeDoc](https://typedoc.org), a supported editor (like [Visual Studio Code](https://code.visualstudio.com/)) can provide on-the-fly information on functions, parameters, etc..

### 3.1 Importing the module
To use any of the functionality we need to import the module. 
```typescript
import { Thermostat } from "thermostat-pi-dht"
```

### 3.2 Global configuration
tbd

### 3.3 Add thermostats
tbd

## 4. Contributing
Contact the main author ([Henning Kerstan](https://henningkerstan.de)) if you want to contribute. More details will be available here soon.

This project uses [semantic versioning](https://semver.org/). However, despite most of the API being ready, note that since we are still in development (version 0.x.y), anything may yet change at any time. 

For detailed information on the (minimal) required versions, have a look at the [package.json](https://github.com/henningkerstan/enocean-core/blob/main/package.json).

## 5. Version history
As this library has not yet fully matured (version is still < 1.0.0), please have a look at the git commit log for a version history.


## 6. License
Copyright 2021 [Henning Kerstan](https://henningkerstan.de)

SPDX-License-Identifier: Apache-2.0

## Configuration (config.json)
This software is configured using a simple JSON-file `config.json`. Here is how it should look like:
```JSON
{
  "host": "0.0.0.0",
  "port": 8000,
  "sensorPowerPin": 8,
  "heartbeatLedPin": 7,
  "sensorWarmUpTime": 4,
  "samplingInterval": 10,
  "thermostats": [
    { "id": 1, "label": "Kitchen", "sensorPin": 24, "setpoint": 18 },
    { "id": 2, "label": "Living room", "sensorPin": 25, "actuatorPin": 11 },
    { "id": 3, "label": "Bedroom", "sensorPin": 13, "actuatorPin": 17 },
  ]
}
```