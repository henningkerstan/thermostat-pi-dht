// Project: thermostat-pi-dht
// File: ThermostatData.ts
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

import { ThermostatSetpoint } from './ThermostatSetpoint'

/** The data describing the latest state of a thermostat (without its technical configuration). */
export interface ThermostatData extends ThermostatSetpoint {
  /** UNIX timestamp (in milliseconds) of the latest measurement. */
  timestamp?: number

  /** Temperature (in °C) measured in the latest measurement. */
  temperature?: number

  /** Relative humidity (in %) measured in the latest measurement. */
  humidity?: number

  /** Determines whether the heating is currently on.  */
  heatingIsOn?: boolean
}
