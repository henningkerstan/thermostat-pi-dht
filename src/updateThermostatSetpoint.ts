// Project: thermostat-pi-dht
// File: updateRemoteThermostatSetpoint.ts
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

import * as http from 'http'
import { HMACAuthenticatedData } from './HMACAuthenticatedData'
import { ThermostatSetpoint } from './ThermostatSetpoint'

export function updateRemoteThermostatSetpoint(
  host: string,
  name: string,
  setpoint: number,
  hmacKey: Buffer,
  port = 8000,
  endpoint: 'data.json' | 'config.json' = 'data.json'
) {
  const thermostatSetpoint = new ThermostatSetpoint()
  thermostatSetpoint.name = name
  thermostatSetpoint.setpoint = setpoint
  const ad = HMACAuthenticatedData.authenticate(hmacKey, thermostatSetpoint)
  const data = JSON.stringify(ad)

  const options = {
    hostname: host,
    port: port,
    path: '/' + endpoint,
    method: 'POST',
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'application/json',

      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Length': data.length,
    },
  }

  const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`)

    res.on('data', (d) => {
      process.stdout.write(d)
    })
  })

  req.on('error', (error) => {
    console.error(error)
  })

  req.write(data)
}
