#!/usr/bin/env node
// Project: thermostat-pi-dht
// File: thermostat-pi-dht.ts
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
import { Thermostat } from './Thermostat'
import { Configuration } from './Configuration'
import * as http from 'http'
import { HeartbeatLED } from '@henningkerstan/heartbeat-led-pi'
import { createHmac, randomBytes } from 'crypto'

let host: string
let port: number
let hmacKey: Buffer = undefined
let heartbeatLED: HeartbeatLED
const thermostats: Thermostat[] = []
let server: http.Server = undefined

function readVersionFromPackageJSON(): string {
  // read version number from package json
  const packageJsonFile = __dirname + '/../package.json'
  if (fs.existsSync(packageJsonFile)) {
    try {
      const fileContent = fs.readFileSync(packageJsonFile, { encoding: 'utf8' })
      const packageJson = <{ version?: string }>JSON.parse(fileContent)
      if (packageJson.version) {
        return packageJson.version
      }
    } catch (error) {
      // nothing to be done
    }
  }
  return '<UNKNOWN>'
}

function init() {
  const version = readVersionFromPackageJSON()
  console.log('thermostat-pi-dht v' + version)

  if (!loadConfiguration()) {
    exit(-1)
  }

  // ensure proper shutdown on signals
  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('SIGQUIT', () => {
    void shutdown('SIGQUIT')
  })
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('SIGHUP', () => {
    void shutdown('SIGHUP')
  })

  server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    switch (url.pathname) {
      case '/data.json':
        {
          const timestamp = Date.now()
          const json = { timestamp: timestamp, payload: thermostats, hmac: '' }
          const hmac = createHmac('sha512', hmacKey)
          const hashInput = JSON.stringify({
            timestamp: timestamp,
            payload: thermostats,
          })
          hmac.update(hashInput)
          json.hmac = hmac.digest('hex')
          res.setHeader('Content-Type', 'application/json')
          res.writeHead(200)
          res.end(JSON.stringify(json))
        }
        break
    }
  })

  server.listen(port, host, () => {
    console.log(`server is running on http://${host}:${port}`)
    console.log('STARTUP COMPLETE')
  })

  thermostats.forEach((thermostat) => thermostat.activate())
  if (heartbeatLED) {
    heartbeatLED.start()
  }
}

function loadConfiguration(): boolean {
  const args = process.argv.slice(2)

  if (args.length > 1) {
    console.log(
      'Usage: "thermostat-pi-dht" or "thermostat-pi-dht /path/to/config.json".\n\nIf called without path, the "config.json" must be placed in "/etc/thermostat-pi-dht/config.json". Note that this program requires super user privileges to access the GPIOs.'
    )
    exit(-1)
  }

  const configFile =
    args.length === 1 ? args[0] : '/etc/thermostat-pi-dht/config.json'

  if (!fs.existsSync(configFile)) {
    console.error(`ERROR: Could not find configuration file "${configFile}".`)
    return false
  }

  const fileContent = fs.readFileSync(configFile, { encoding: 'utf8' })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config: Configuration = JSON.parse(fileContent)

  if (config.sensorWarmUpTime) {
    Thermostat.samplingInterval = config.samplingInterval
    console.log(
      'custom sampling interval: ' +
        Thermostat.samplingInterval.toString() +
        's'
    )
  } else {
    console.log(
      'default sampling interval: ' +
        Thermostat.samplingInterval.toString() +
        's'
    )
  }

  if (config.sensorWarmUpTime) {
    Thermostat.sensorWarmUpTime = config.sensorWarmUpTime
    console.log(
      'custom sensor warmup: ' + Thermostat.sensorWarmUpTime.toString() + 's'
    )
  } else {
    console.log(
      'default sensor warmup: ' + Thermostat.sensorWarmUpTime.toString() + 's'
    )
  }

  if (config.timeoutSeconds) {
    Thermostat.timeout = config.timeoutSeconds
    console.log(
      'custom (global) sensor timeout: ' + Thermostat.timeout.toString() + 's'
    )
  } else {
    console.log(
      'default (global) sensor timeout: ' + Thermostat.timeout.toString() + 's'
    )
  }

  if (config.heartbeatPin) {
    heartbeatLED = new HeartbeatLED(config.heartbeatPin)
    console.log(
      'heartbeat LED connected to pin: ' + config.heartbeatPin.toString()
    )
  } else {
    console.log('no heartbeat LED connected')
  }

  if (config.sensorPowerPin) {
    Thermostat.sensorPowerPin = config.sensorPowerPin
    console.log(
      'sensor power control connected to pin: ' +
        Thermostat.sensorPowerPin.toString()
    )
  } else {
    console.log('no sensor power control (sensor power always on)')
  }

  console.log('loading thermostats')
  for (const r of config.thermostats) {
    if (!r.name) {
      console.warn(
        'WARNING: skipping thermostat without name: ' + JSON.stringify(r)
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

  // todo: ensure that hmacKey, if present, is sufficiently large
  if (!config.hmacKey) {
    config.hmacKey = randomBytes(64).toString('base64')
    fs.writeFileSync(configFile, JSON.stringify(config))
    console.log(
      'No HMAC key was found in configuration. A new (random) key has been added to the configuration.'
    )
  }

  hmacKey = Buffer.from(config.hmacKey, 'base64')

  console.log('listening on: ' + host + ':' + port.toString())

  return true
}

function shutdown(signalName: string) {
  console.log(
    'Inititiating shutdown due to received "' + signalName + '" signal'
  )

  Thermostat.deactivateAll()
  if (heartbeatLED) {
    heartbeatLED.stop()
  }
  process.exit()
}

init()
