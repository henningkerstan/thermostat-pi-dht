// Project: thermostat-pi-dht
// File: Thermostat.ts
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

import delay from 'delay'
import { Gpio } from 'pigpio'
import dht, { Dht, DhtResult } from 'pigpio-dht'
import { SensorType } from './SensorType'
import { ThermostatConfiguration } from './ThermostatConfiguration'
import { ThermostatData } from './ThermostatData'

/** An implementation of a thermostat on a Raspberry Pi using
 * - a DHT11 or DHT22/AM2302 sensor and
 * - a GPIO as actuator.
 *
 * Once activated, a thermostat regularly measures the current [[temperature]] (and relative [[humidity]]). It then activates or deactivates the [[actuatorPin | actuator GPIO]] (which in turn should control the heating, e.g. by using a relay) by comparing the current [[temperature]] with the given [[setpoint]]:
 * - if the [[temperature]] is below the [[setpoint]], it activates the actuator and
 * - if the [[temperature]] is equal to or above the [[setpoint]], it deactivates the actuator.
 *
 * ## Common measuring loop
 * Note that this implementation uses a *common measuring loop* for all configured thermostats, hence the [[samplingInterval]] as well as the measurement [[timeout]] is configured globally (i.e. as static variables).
 *
 * ## Power rail activation/deactivation
 * The implementation optionally supports a (common) *power rail activation/deactivation*: If a [[sensorPowerPin]] is specified, power to the DHT sensors will be switched on prior to a measurement and switched off after measurements finished (or timed out). The [[sensorWarmUpTime]] determines, how long (in seconds) the software will wait until starting a measurement after power has been activated.
 */
export class Thermostat {
  /** Sampling interval (in seconds) for all thermostats.
   *
   * This is the interval ranging from
   * - the finalization (or timeout) of a measurement run to
   * - the next start of the measurement run.  */
  public static samplingInterval = 120

  /** Sensor warm-up time (in seconds). */
  public static sensorWarmUpTime = 4

  /** Timeout after which all measurements will be stopped.  */
  public static timeout = 5

  /** GPIO pin controlling the power supply for all connected DHT sensors. If undefined, power is assumed to be always on. */
  public static get sensorPowerPin(): number {
    return this._sensorPowerPin
  }

  /** GPIO pin controlling the power supply for all connected DHT sensors. If undefined, power is assumed to be always on. */
  public static set sensorPowerPin(pin: number) {
    this._sensorPowerPin = pin
    this._sensorPowerGpio = new Gpio(pin, {
      mode: Gpio.OUTPUT,
    })
  }

  /** The default temperature (in °C) to be maintained by a newly created thermostat, if no such value is configured on creation. */
  public static defaultSetpoint = 18

  /** The default sensor type for a new thermostat. */
  public static defaultSensorType: SensorType = 22

  private static remainingMeasurements = 0

  private static activeInstances: Map<number, Thermostat> = new Map()
  private static nextInternalId = 0

  /** Constructs a new thermostat based on the supplied configuration. */
  constructor(config: ThermostatConfiguration) {
    this.internalId = Thermostat.nextInternalId++

    this.name = config.name

    if (config.sensorPin) {
      this.sensor = dht(
        config.sensorPin,
        config.sensorType ? config.sensorType : Thermostat.defaultSensorType
      )
      this.sensorPin = config.sensorPin

      this.sensor.on('activate', () => {
        // nothing to be done
      })
  
      this.sensor.on('badChecksum', () => {
        this.onData(undefined, undefined)
      })
  
      this.sensor.on('result', (data: DhtResult) => {
        this.onData(data.temperature, data.humidity)
      })
  
      this.sensor.on('end', () => {
        // nothing to be done
        // TODO: maybe reduce measurement counter here?
      })  
    }

    this.setpoint = config.setpoint
      ? config.setpoint
      : Thermostat.defaultSetpoint

    if (config.actuatorPin) {
      this.actuator = new Gpio(config.actuatorPin, { mode: Gpio.OUTPUT })
      this.actuatorPin = config.actuatorPin

      // disable actuator if no sensor is defined
      if(!config.sensorPin){
        this.actuator.digitalWrite(0)
      }
    }
  }

  /** A string to uniquely identify a thermostat. */
  readonly name: string

  /** The desired temperature (in °C) to be maintained by the thermostat. */
  get setpoint(): number {
    return this._setpoint
  }

  /** The desired temperature (in °C) to be maintained by the thermostat. */
  set setpoint(temperature: number) {
    this._setpoint = temperature
    void this.check()
  }

  /** The sensor's type. Must be either 11 (DHT11) or 22 (DHT22/AM2302). */
  readonly sensorType: SensorType

  /** UNIX timestamp (in milliseconds) of the latest measurement. */
  get timestamp(): number {
    return this._timestamp
  }

  /** Temperature (in °C) measured in the latest measurement. */
  get temperature(): number {
    return this._temperature
  }

  /** Relative humidity (in %) measured in the latest measurement. */
  get humidity(): number {
    return this._humidity
  }

  /** Determines whether the heating is currently on.  */
  get heatingIsOn(): boolean {
    return this._heatingIsOn
  }

  /** Determines whether the thermostat is active. */
  get isActive(): boolean {
    return Thermostat.activeInstances.has(this.internalId)
  }

  // Private members

  /** GPIO pin controlling the power supply for all connected DHT sensors. If undefined, power is assumed to be always on. */
  private static _sensorPowerPin: number = undefined

  /** GPIO controlling the power supply for all connected DHT sensors. If undefined, power is assumed to be always on. */
  private static _sensorPowerGpio: Gpio = undefined

  /** The main measurement loop.*/
  private static async main() {
    // nothing to be done if not active
    if (!this._isActive) {
      return
    }

    if (this._sensorPowerGpio) {
      // power up sensors ...
      this._sensorPowerGpio.digitalWrite(1)

      // ... and wait for sensor warmup (at least one second)
      await delay(Math.max(1000, 1000 * this.sensorWarmUpTime))
    }

    // start measurements
    Thermostat.remainingMeasurements = 0
    this.activeInstances.forEach((thermostat) => {
      Thermostat.remainingMeasurements++
      thermostat.sensor.read()
    })

    // wait for measurements to finish
    const started = Date.now()
    while (Thermostat.remainingMeasurements > 0) {
      await delay(1000)
      const duration = (Date.now() - started) / 1000
      if (duration > this.timeout) {
        break
      }
    }

    if (this._sensorPowerGpio) {
      // power down sensors
      this._sensorPowerGpio.digitalWrite(0)
    }

    // determine next activation of this function (at least 2s required)
    const wait = Math.max(2000, this.samplingInterval * 1000)

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(this.main.bind(this), wait)
  }

  /** Activates the main measurement loop for all active thermostats. */
  private static async activate() {
    // nothing to be done if already active
    if (this._isActive) {
      return
    }

    this._isActive = true

    // wait
    await delay(1000)

    // run main loop
    void this.main()
  }

  // Deactivates all active thermostats at once.
  static deactivateAll(): void {
    this._isActive = false

    if (this._sensorPowerGpio) {
      this._sensorPowerGpio.digitalWrite(0)
    }

    this.activeInstances.forEach((thermostat) => {
      thermostat.deactivate()
    })
  }

  /** Used to uniquely track instances internally. */
  private internalId: number

  /** The desired temperature (in °C) to be maintained by the thermostat. */
  private _setpoint = 18

  /** A sensor to measure the temperature (and humidity). */
  private sensor: Dht

  /** GPIO pin to which the sensor is connected. */
  private sensorPin: number

  /** A GPIO controlling the heating device. */
  private actuator: Gpio

  /** GPIO pin to which the actuator is connected. */
  private actuatorPin: number

  /** UNIX timestamp (in milliseconds) of the latest measurement. */
  private _timestamp: number = undefined

  /** Temperature (in °C) of the latest measurement. */
  private _temperature: number = undefined

  /** Relative humidity (in %) of the latest measurement. */
  private _humidity: number = undefined

  /** Determines whether the thermostat is active. */
  private static _isActive = false

  /** Determines whether the heating is currently on.  */
  private _heatingIsOn = false

  /** Handles new temperature/humidity data. */
  private onData(temperature: number, humidity: number) {
    Thermostat.remainingMeasurements--

    this._timestamp = Date.now()
    this._temperature = Math.round(temperature * 10) / 10
    this._humidity = Math.round(humidity)

    void this.check()
  }

  /** Checks if heating needs to be switched on/off */
  private async check() {
    if (!this.actuator) {
      this._heatingIsOn = false
      return
    }

    if (this.temperature) {
      // heating is on iff measured temperatore does not yet exceed setpoint
      this._heatingIsOn = this.temperature >= this.setpoint ? false : true
      // TODO: implement hysteresis to prevent too frequent switching
    } else {
      // if measurement failed, switch off heating
      this._heatingIsOn = false
    }

    // to prevent simultaneous relay switching, add random delay of up to 500ms
    const ms = Math.random() * 500
    await delay(ms)
    this.actuator.digitalWrite(this.heatingIsOn === true ? 1 : 0)
  }

  /** Activates the thermostat. */
  activate(): void {
    // cannot activate an already active thermostat
    if (Thermostat.activeInstances.has(this.internalId)) {
      return
    }

    // add to list of active instances
    Thermostat.activeInstances.set(this.internalId, this)

    //activate main loop
    void Thermostat.activate()
  }

  /** Deactivates the thermostat.
   * @param heatingOn Determines whether after deactivation of the thermostat the heating is off (default) or on (if set to true).
   */
  deactivate(heatingOn = false): void {
    // remove from list of active instances
    Thermostat.activeInstances.delete(this.internalId)

    if (Thermostat.activeInstances.size < 1) {
      Thermostat._isActive = false
    }

    // switch heating on/off
    if (this.actuator) {
      this.actuator.digitalWrite(heatingOn ? 1 : 0)
    }
  }

  configurationToJSON(): ThermostatConfiguration {
    return {
      name: this.name,
      sensorPin: this.sensorPin,
      sensorType: this.sensorType,
      actuatorPin: this.actuatorPin,
      setpoint: this.setpoint,
    }
  }

  toJSON(): ThermostatData {
    return {
      name: this.name,
      setpoint: this.setpoint,
      timestamp: this.timestamp,
      temperature: this.temperature,
      humidity: this.humidity,
      heatingIsOn: this.heatingIsOn,
    }
  }

  toString(): string {
    return JSON.stringify(this.toJSON())
  }
}
