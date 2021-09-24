// Project: thermostat-pi-dht
// File: ThermostatSetpointUpdateOptions.ts
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

export interface ThermostatSetpointUpdateOptions {
  host: string
  port: number
  thermostatName: string
  setpoint: number
  hmacKey: Buffer
  endpoint: 'data.json' | 'config.json'
}
