// Project: thermostat-pi-dht
// File: Configuration.ts
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

import { ThermostatConfiguration } from './ThermostatConfiguration'

/** Configuration of the standalone app 'thermostat-pi-dht'. */
export interface Configuration {
  /** Delay (in seconds) between sensor power on and start of measurements. */
  sensorWarmUpTime?: number

  /** Sampling interval (in seconds) for all thermostats.
   *
   * This is the interval ranging from
   * - the finalization (or timeout) of a measurement run to
   * - the next start of the measurement run.  */
  samplingInterval?: number

  /** GPIO pin controlling the power supply for all connected DHT sensors. If undefined, power is assumed to be always on. */
  sensorPowerPin?: number

  /** GPIO pin to which a heartbeat LED is connected. */
  heartbeatPin?: number

  /** Configuration of the thermostats. */
  thermostats: ThermostatConfiguration[]

  host?: string
  port?: number

  /** Timeout (in seconds) after which all measurements will be stopped.  */
  timeoutSeconds?: number

  /** 64 byte HMAC key in base64 encoding. */
  hmacKey?: string
}
