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

import { Configuration } from './Configuration'
import { HMACAuthenticatedPayload } from '@henningkerstan/hmac-authenticated-payload'
import { httpPostJSON } from './httpPostJSON'
import { ThermostatData } from './ThermostatData'
import { ThermostatSetpoint } from './ThermostatSetpoint'
import { ThermostatSetpointUpdateOptions } from './ThermostatSetpointUpdateOptions'

export async function updateRemoteThermostatSetpoint(
  options: ThermostatSetpointUpdateOptions
): Promise<ThermostatData> {
  // create ThermostatSetpoint object
  const thermostatSetpoint = new ThermostatSetpoint()
  thermostatSetpoint.name = options.thermostatName
  thermostatSetpoint.setpoint = options.setpoint

  // enclose the ThermostatSetpoint in HMACAuthenticatedData
  let ad = HMACAuthenticatedPayload.create(options.hmacKey, thermostatSetpoint)

  // post the stringified data and wait for the response
  const result = await httpPostJSON({
    host: options.host,
    port: options.port,
    path: '/' + options.endpoint,
    json: JSON.stringify(ad),
  })

  // parse the result as JSON
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const resultObject: { nonce?: string; payload?: unknown; hmac?: string } =
    JSON.parse(result)

  // create an HMACAuthenticatedData from the received result
  ad = new HMACAuthenticatedPayload(
    resultObject.payload,
    resultObject.nonce,
    resultObject.hmac
  )

  // validate the hmac
  if (!ad.validate(options.hmacKey)) {
    return Promise.reject()
  }

  // interpret the received data; extract data for the updated thermostat
  const thermostatData: ThermostatData = { name: options.thermostatName }

  // depending on the endpoint, the received data will be different
  switch (options.endpoint) {
    case 'config.json': {
      const configuration: Configuration = <Configuration>ad.payload
      for (const t of configuration.thermostats) {
        if (t.name === options.thermostatName) {
          thermostatData.setpoint = t.setpoint
          return thermostatData
        }
      }
      break
    }

    case 'data.json': {
      const thermostats: ThermostatData[] = <ThermostatData[]>ad.payload
      for (const t of thermostats) {
        if (t.name === options.thermostatName) {
          thermostatData.setpoint = t.setpoint
          thermostatData.timestamp = t.timestamp
          thermostatData.temperature = t.temperature
          thermostatData.humidity = t.humidity
          thermostatData.heatingIsOn = t.heatingIsOn
          return thermostatData
        }
      }
    }
  }

  return Promise.reject()
}
