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
import { randomBytes } from 'crypto'
import { HMACAuthenticatedData } from './HMACAuthenticatedData'
import { ThermostatConfiguration } from './ThermostatConfiguration'
import { ThermostatSetpoint } from '.'

let host: string
let port: number
let hmacKey: Buffer = undefined
let heartbeatLED: HeartbeatLED
const thermostats: Thermostat[] = []
let server: http.Server = undefined
let configFile: string

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

function handleHTTPRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
) {
  const url = new URL(req.url, `http://${req.headers.host}`)

  // only serve two endpoints
  if (url.pathname !== '/data.json' && url.pathname !== '/config.json') {
    return
  }

  res.setHeader('Content-Type', 'application/json')
  res.writeHead(200)

  // on both endpoints GETting is ok
  if (req.method === 'GET') {
    switch (url.pathname) {
      case '/data.json':
        res.end(
          JSON.stringify(
            HMACAuthenticatedData.authenticate(hmacKey, thermostats)
          )
        )
        break
      case '/config.json':
        res.end(
          JSON.stringify(
            HMACAuthenticatedData.authenticate(hmacKey, currentConfiguration())
          )
        )
    }
  }

  // on both endpoints POSTing is ok; body must contain ThermostatSetpoint encapsulated in a valid HMACAuthenticatedData
  if (req.method === 'POST') {
    let body = ''
    req.on('data', (data) => {
      body += data
    })

    req.on('end', () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const bodyJSON: { nonce?: string; hmac?: string; payload?: unknown } =
          JSON.parse(body)

        // parse data
        const ad = new HMACAuthenticatedData()
        ad.payload = bodyJSON.payload
        ad.nonce = bodyJSON.nonce
        ad.hmac = bodyJSON.hmac

        // check nonce is within 2s of my time
        const timestamp = Date.now()
        const deviation = Math.abs(timestamp - parseInt(ad.nonce))

        if (deviation > 2000) {
          throw new Error(
            'Invalid nonce: Deviation from current timestamp exceeds 2s.'
          )
        }

        // check HMAC
        if (!ad.validate(hmacKey)) {
          throw new Error('HMAC invalid.')
        }

        // payload must be A ThermostatSetpoint
        const thermostatSetpoint = <ThermostatSetpoint>ad.payload
        if (!thermostatSetpoint.name || !thermostatSetpoint.setpoint) {
          throw new Error('Not a valid ThermostatSetpoint')
        }

        // find matching thermostat and adjust setpoint, if found
        let succeeded = false
        for (const t of thermostats) {
          if (t.name === thermostatSetpoint.name) {
            t.setpoint = thermostatSetpoint.setpoint
            // pretty print the JSON to the config file using 2 spaces
            fs.writeFileSync(
              configFile,
              JSON.stringify(currentConfiguration(true), null, 2)
            )
            succeeded = true
            break
          }
        }

        if (!succeeded) {
          throw new Error('Thermostat not found.')
        }
      } catch (error) {
        console.warn('Invalid POST request.')
        console.warn(error)
      }

      switch (url.pathname) {
        case '/data.json':
          res.end(
            JSON.stringify(
              HMACAuthenticatedData.authenticate(hmacKey, thermostats)
            )
          )
          break
        case '/config.json':
          res.end(
            JSON.stringify(
              HMACAuthenticatedData.authenticate(
                hmacKey,
                currentConfiguration()
              )
            )
          )
      }
    })
    return
  }
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

  // create the server with two endpoints 'data.json' and 'config.json'
  server = http.createServer(handleHTTPRequest)

  server.listen(port, host, () => {
    console.log(`server is running on http://${host}:${port}`)
    console.log("- sensor is available on 'data.json' endpoint")
    console.log("- configuration data is available on 'config.json' endpoint")
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

  configFile =
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
    // pretty print the JSON to the config file using 2 spaces
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    console.log(
      'No HMAC key was found in configuration. A new (random) key has been added to the configuration.'
    )
  }

  hmacKey = Buffer.from(config.hmacKey, 'base64')

  console.log('listening on: ' + host + ':' + port.toString())

  return true
}

/** Return the current configuration (default without the HMAC key). */
function currentConfiguration(withHMACkey = false): Configuration {
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
    heartbeatPin: heartbeatLED ? heartbeatLED.pin : undefined,
    timeoutSeconds: Thermostat.timeout,
    thermostats: thermostatConfigurations,
    hmacKey: withHMACkey ? hmacKey.toString('base64') : undefined,
  }
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
