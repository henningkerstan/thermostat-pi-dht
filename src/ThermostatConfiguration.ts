// Project: thermostat-pi-dht
// File: ThermostatConfiguration.ts
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

/** Configuration data for a single thermostat. */
export interface ThermostatConfiguration extends ThermostatSetpoint {
  /** GPIO pin to which the sensor is connected. */
  sensorPin?: number

  /** The sensor's type. Must be either 11 (DHT11) or 22 (DHT22/AM2302). */
  sensorType?: number

  /** GPIO pin to which the actuator is connected. */
  actuatorPin?: number

  /** A simple correction of the measured temperature by a fixed summand. */
  temperatureSummand?: number

  /** Hysteresis (in °C). -- NOT YET IMPLEMENTED */
  //hysteresis?: number
}
