# thermostat-pi-dht
A Node.js framework (standalone application + library) to control a heating system with a Raspberry Pi using DHT11 or DHT22/AM3202 sensors and GPIO actuators. 


## Table of Contents
1. [Description](#1-description)
1. [Installation](#2-installation)
1. [Usage](#3-usage)
1. [Contributing](#4-contributing)
1. [Version History](#5-version-history)
1. [License](#6-license)


## 1. Description 
This package contains a Node.js framework (standalone application + library) to control a heating system with a Raspberry Pi using DHT11 or DHT22/AM3202 sensors and GPIO actuators. 

- The standalone application can be used to control a heating system and access its configuration via a simple, JSON-based web-API.
- The library can be used to implement the thermostat functionality in a larger application.

## 2. Installation
This framework is available as a Node.js-module. You can thus use Node.js' package manager `npm` to install the latest production version from the [npm registry](https://npmjs.com). Depending on your use case, the installation method differs slightly. 

### 2.1 Standalone application
For using the standalone application it is best to install the package globally by running the following command.

    sudo npm i -g thermostat-pi-dht


### 2.2 Library 
For using the standalone application it is best to install the package locally by running the following command

    sudo npm i thermostat-pi-dht

in your project's directory.


## 3. Usage
### 3.1 Standalone application
Once the package is installed, the standalone application `thermostat-dht-pi` requires a JSON configuration. The default location is `/etc/thermostat-dht-pi/config.json`.  Here is an example for such a configuration file:
```JSON
{
  "sensorWarmUpTime": 4,
  "samplingInterval": 10,
  "sensorPowerPin": 8,
  "heartbeatPin": 7,
  "host": "0.0.0.0",
  "port": 8000,
  "thermostats": [
    { "id": 1, "label": "Kitchen", "sensorPin": 24, "setpoint": 18 },
    { "id": 2, "label": "Living room", "sensorPin": 25, "actuatorPin": 11 },
    { "id": 3, "label": "Bedroom", "sensorPin": 13, "actuatorPin": 17 },
  ]
}
```
Once created, you can start the application with
```
sudo thermostat-pi-dht
```
if you have used the default location or alternatively with
```
sudo thermostat-pi-dht /path/to/config.json
```


### 3.2 Use the Thermostat class in your own application
Since this framework is written in TypeScript, you can use it both with TypeScript as well as with plain JavaScript. Below you can find short examples to get you started in both languages. 

The library also comes with an online [documentation](https://henningkerstan.github.io/thermostat-pi-dht/). A good starting point for further reading is the [documentation of the Thermostat class](https://henningkerstan.github.io/thermostat-pi-dht/classes/Thermostat.Thermostat-1.html). Moreover, as this documentation is generated from source code comments using [TypeDoc](https://typedoc.org), a supported editor (like [Visual Studio Code](https://code.visualstudio.com/)) can provide on-the-fly information on functions, parameters, etc..

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

