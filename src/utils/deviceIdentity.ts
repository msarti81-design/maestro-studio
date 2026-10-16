export interface DeviceUserIdentity {
  username: string;
  deviceId: string;
  transferCode: string;
  isVerified: boolean;
  error?: string;
}

const DEVICE_ID_KEY = 'maestro_device_id';
const USERNAME_KEY = 'maestro_username';
const TRANSFER_CODE_KEY = 'maestro_transfer_code';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'dev_server';
  try {
    let devId = localStorage.getItem(DEVICE_ID_KEY);
    if (!devId) {
      devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, devId);
    }
    return devId;
  } catch (e) {
    return `dev_${Date.now()}`;
  }
}

export function getStoredUsername(): string {
  if (typeof window === 'undefined') return 'Maestro';
  try {
    const saved = localStorage.getItem(USERNAME_KEY);
    if (saved && saved.trim()) return saved.trim();
    const defaultName = `Pianista_${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem(USERNAME_KEY, defaultName);
    return defaultName;
  } catch (e) {
    return 'Maestro';
  }
}

export function getStoredTransferCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(TRANSFER_CODE_KEY) || '';
  } catch (e) {
    return '';
  }
}

export async function verifyAndLockUsername(username: string): Promise<DeviceUserIdentity> {
  const deviceId = getDeviceId();
  const cleanName = username.trim() || getStoredUsername();

  try {
    const res = await fetch('/api/user/register-or-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanName, deviceId }),
    });

    if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
      throw new Error('Offline or non-JSON response');
    }

    const data = await res.json();
    if (data.success) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USERNAME_KEY, data.username);
        if (data.transferCode) {
          localStorage.setItem(TRANSFER_CODE_KEY, data.transferCode);
        }
      }
      return {
        username: data.username,
        deviceId,
        transferCode: data.transferCode || getStoredTransferCode(),
        isVerified: true,
      };
    } else {
      return {
        username: cleanName,
        deviceId,
        transferCode: getStoredTransferCode(),
        isVerified: false,
        error: data.error || 'Nome utente riservato da un altro dispositivo!',
      };
    }
  } catch (err: any) {
    // Fallback if offline
    return {
      username: cleanName,
      deviceId,
      transferCode: getStoredTransferCode(),
      isVerified: true,
    };
  }
}

export async function transferAccountWithCode(
  targetUsername: string,
  transferCode: string
): Promise<{ success: boolean; error?: string; identity?: DeviceUserIdentity }> {
  const newDeviceId = getDeviceId();
  const cleanName = targetUsername.trim();
  const cleanCode = transferCode.trim().toUpperCase();

  try {
    const res = await fetch('/api/user/transfer-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanName,
        transferCode: cleanCode,
        newDeviceId,
      }),
    });

    if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
      throw new Error('Offline or non-JSON response');
    }

    const data = await res.json();
    if (data.success) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USERNAME_KEY, data.username);
        localStorage.setItem(TRANSFER_CODE_KEY, data.transferCode);
      }
      return {
        success: true,
        identity: {
          username: data.username,
          deviceId: newDeviceId,
          transferCode: data.transferCode,
          isVerified: true,
        },
      };
    } else {
      return {
        success: false,
        error: data.error || 'Codice di Trasferimento errato o non valido!',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: 'Impossibile contattare il server per il trasferimento.',
    };
  }
}
