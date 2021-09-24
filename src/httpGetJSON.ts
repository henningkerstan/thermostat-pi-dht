// Project: thermostat-pi-dht
// File: httpGetJSON.ts
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

/** Get a JSON  */
export async function httpGetJSON(params: {
  host: string
  port: number
  path?: string
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      host: params.host,
      port: params.port,
      path: params.path,
      method: 'GET',
    }

    // construct an http request
    const request = http.request(options)

    // on response: concatenate data and return it when finished; reject on response error
    request.on('response', (res) => {
      let data = ''
      res.on('data', (d) => {
        data += d
      })

      res.on('end', () => {
        resolve(data)
      })

      res.on('error', (err) => {
        reject(err)
      })
    })

    // reject on request error
    request.on('error', (err) => {
      reject(err)
    })

    // get the data
    request.end()
  })
}
