// Project: thermostat-pi-dht
// File: getRemoteThermostatData.ts
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

import { HMACAuthenticatedData } from './HMACAuthenticatedData'
import { httpGetJSON } from './httpGetJSON'
import { RemoteThermostatOptions } from './RemoteThermostatOptions'
import { ThermostatData } from './ThermostatData'

export async function getRemoteThermostatData(
  options: RemoteThermostatOptions
): Promise<ThermostatData[]> {
  // get
  const result = await httpGetJSON({
    host: options.host,
    port: options.port,
    path: '/data.json',
  })

  // parse the result as JSON
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const resultObject: { nonce?: string; payload?: unknown; hmac?: string } =
    JSON.parse(result)

  // create an HMACAuthenticatedData from the received result
  const ad = new HMACAuthenticatedData()
  ad.nonce = resultObject.nonce
  ad.payload = resultObject.payload
  ad.hmac = resultObject.hmac

  // validate the hmac
  if (!ad.validate(options.hmacKey)) {
    console.log('FEILADE VALIDATION')
    return Promise.reject()
  }

  // interpret the received data
  return <ThermostatData[]>ad.payload
}
