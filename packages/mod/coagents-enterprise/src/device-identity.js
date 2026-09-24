import { randomUUID } from 'node:crypto'


const DEVICE_IDENTITY_VERSION = 1


export function normalizeDeviceUuid(value) {
  const deviceUuid = String(value || '').trim()
  if (deviceUuid.length < 8 || deviceUuid.length > 64) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(deviceUuid)) return null
  return deviceUuid
}

export class DeviceIdentityStore {
  constructor(credentials, key) {
    this.credentials = credentials
    this.key = key
  }

  async loadOrCreate(preferredUuid = null) {
    const record = await this.credentials.readRecord(this.key)
    const savedUuid = record?.kind === 'grant'
      && Number(record?.payload?.version) === DEVICE_IDENTITY_VERSION
      ? normalizeDeviceUuid(record.payload.deviceUuid)
      : null
    if (savedUuid) {
      return {
        deviceUuid: savedUuid,
        createdAt: String(record.payload.createdAt || ''),
      }
    }

    // preferredUuid migrates installations that previously kept the device ID
    // only inside the login session. Once written, login/logout never changes it.
    const deviceUuid = normalizeDeviceUuid(preferredUuid) || randomUUID()
    const createdAt = new Date().toISOString()
    await this.credentials.modifyRecord(this.key, async () => ({
      kind: 'grant',
      payload: {
        version: DEVICE_IDENTITY_VERSION,
        deviceUuid,
        createdAt,
      },
    }))
    return { deviceUuid, createdAt }
  }
}
