// Project: thermostat-pi-dht
// File: index.ts
//
// Copyright 2021 Henning Kerstan
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { exit } from 'process'
import fs from 'fs'
import { Gpio } from 'pigpio'
import { Thermostat } from './Thermostat'
import { Configuration } from './Configuration'
import * as http from 'http'
import { ThermostatConfiguration } from './ThermostatConfiguration'

let host = 'localhost'
let port = 8000

let relay8Pin = 5

let thermostats: Thermostat[] = []

let server: http.Server = undefined

function init() {
  if (!loadConfiguration()) {
    exit(-1)
  }

  // ensure proper shutdown on signals
  process.on('SIGINT', () => {
    shutdown('SIGINT')
  })
  process.on('SIGQUIT', () => {
    shutdown('SIGQUIT')
  })
  process.on('SIGTERM', () => {
    shutdown('SIGTERM')
  })

  process.on('SIGHUP', () => {
    shutdown('SIGHUP')
  })

  // switch relay8pin to off
  const relay8Gpio = new Gpio(relay8Pin, { mode: Gpio.OUTPUT })
  relay8Gpio.digitalWrite(0)

  server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    switch (url.pathname) {
      case '/data.json':
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(200)
        res.end(JSON.stringify(thermostats))
        break

      case '/config.json':
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(200)

        res.end(JSON.stringify(configurationToJSON()))
        break
    }
  })
  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`)
    console.log("- sensor is available on 'data.json' endpoint")
    console.log("- configuration data is available on 'config.json' endpoint")
  })

  thermostats.forEach((thermostat) => thermostat.activate())
}

function loadConfiguration(): boolean {
  if (!fs.existsSync('config.json')) {
    console.error('ERROR: Could not find configuration file "config.json".')
    return false
  }

  const fileContent = fs.readFileSync('config.json', { encoding: 'utf8' })
  const config: Configuration = JSON.parse(fileContent)

  if (config.sensorWarmUpTime) {
    Thermostat.samplingInterval = config.samplingInterval
    console.log(
      'custom sampling interval: ' + Thermostat.samplingInterval + 's'
    )
  } else {
    console.log(
      'default sampling interval: ' + Thermostat.samplingInterval + 's'
    )
  }

  if (config.sensorWarmUpTime) {
    Thermostat.sensorWarmUpTime = config.sensorWarmUpTime
    console.log('custom sensor warmup: ' + Thermostat.sensorWarmUpTime + 's')
  } else {
    console.log('default sensor warmup: ' + Thermostat.sensorWarmUpTime + 's')
  }

  if (config.timeoutSeconds) {
    Thermostat.timeout = config.timeoutSeconds
    console.log('custom (global) sensor timeout: ' + Thermostat.timeout + 's')
  } else {
    console.log('default (global) sensor timeout: ' + Thermostat.timeout + 's')
  }

  if (config.heartbeatPin) {
    Thermostat.heartbeatPin = config.heartbeatPin
    console.log('heartbeat LED connected to pin: ' + Thermostat.heartbeatPin)
  } else {
    console.log('no heartbeat LED connected')
  }

  if (config.sensorPowerPin) {
    Thermostat.sensorPowerPin = config.sensorPowerPin
    console.log(
      'sensor power control connected to pin: ' + Thermostat.sensorPowerPin
    )
  } else {
    console.log('no sensor power control (sensor power always on)')
  }

  console.log('Loading thermostats')
  for (const r of config.thermostats) {
    if (!r.id) {
      console.warn(
        'WARNING: skipping thermostat without id: ' + JSON.stringify(r)
      )
      continue
    }

    if (!r.label) {
      console.warn(
        'WARNING: skipping thermostat without label: ' + JSON.stringify(r)
      )
      continue
    }

    if (!r.sensorPin) {
      console.warn(
        ' WARNING: skipping thermostat without sensorPin: ' + JSON.stringify(r)
      )
      continue
    }

    thermostats.push(new Thermostat(r))
    console.log(' ' + JSON.stringify(r))
  }

  if (thermostats.length < 1) {
    console.error('ERROR: No valid thermostats found.')
    return false
  }

  host = config.host ? config.host : 'localhost'
  port = config.port ? config.port : 8000

  console.log('listening on: ' + host + ':' + port)

  return true
}

function configurationToJSON(): Configuration {
  const thermostatConfigurations: ThermostatConfiguration[] = []
  thermostats.forEach((t) => {
    thermostatConfigurations.push(t.configurationToJSON())
  })
  return {
    host: host,
    port: port,
    sensorWarmUpTime: Thermostat.sensorWarmUpTime,
    samplingInterval: Thermostat.samplingInterval,
    sensorPowerPin: Thermostat.sensorPowerPin,
    heartbeatPin: Thermostat.heartbeatPin,
    timeoutSeconds: Thermostat.timeout,
    thermostats: thermostatConfigurations,
  }
}

async function shutdown(signalName: string) {
  console.log(
    'Inititiating shutdown due to received "' + signalName + '" signal'
  )

  Thermostat.deactivateAll()
  process.exit()
}

init()
