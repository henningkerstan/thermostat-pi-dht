// Project: thermostat-pi-dht
// File: HMACAuthenticatedData.ts
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

import { createHmac } from 'crypto'

/** A wrapper to authenticate an object (the 'payload') using a SHA-512 HMAC tag.
 * Computation of the HMAC includes a nonce to support prevention of replay attacks. The input to the HMAC is the concatenation of the nonce, "." and the base64-encoding of the JSON.stringification of the payload.
 */
export class HMACAuthenticatedData {
  /** Create a valid HMACAuthenticatedData object using the supplied key, payload and (optionally) a user defined nonce. If no nonce is supplied, the current UNIX timestamp (in milliseconds) will be used as nonce.   */
  static authenticate(
    key: Buffer,
    payload: unknown,
    nonce = Date.now().toString()
  ): HMACAuthenticatedData {
    const ad = new HMACAuthenticatedData()
    ad.payload = payload
    ad.nonce = nonce
    ad.hmac = ad.computeHMAC(key)
    return ad
  }

  /** A cryptographic nonce. */
  nonce: string

  /** The data which shall be authenticated. */
  payload: unknown

  /** The hmac tag in base64 encoding. */
  hmac: string

  /** Computes the correct HMAC of this object and compares it to the stored HMAC. Returns true if and only if they coincide. */
  validate(key: Buffer): boolean {
    return this.hmac === this.computeHMAC(key)
  }

  /** Compute the HMAC for this object using the supplied key. */
  private computeHMAC(key: Buffer): string {
    const hmacInput =
      this.nonce +
      '.' +
      Buffer.from(JSON.stringify(this.payload)).toString('base64')

    const hmac = createHmac('sha512', key)
    hmac.update(hmacInput)
    return hmac.digest('base64')
  }
}
