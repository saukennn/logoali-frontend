// Device Fingerprinting para identificar dispositivos únicos
// Combina múltiplas características do navegador/dispositivo

export interface DeviceFingerprint {
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  cookieEnabled: boolean
  hardwareConcurrency: number
  deviceMemory?: number
  fingerprint: string // Hash único combinando todas as características
}

export function generateDeviceFingerprint(): DeviceFingerprint {
  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || undefined,
    fingerprint: '',
  }

  // Criar hash único combinando todas as características
  const fingerprintString = [
    fingerprint.userAgent,
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.platform,
    fingerprint.cookieEnabled.toString(),
    fingerprint.hardwareConcurrency.toString(),
    fingerprint.deviceMemory?.toString() || '',
  ].join('|')

  // Gerar hash simples (em produção, usar crypto.subtle)
  fingerprint.fingerprint = simpleHash(fingerprintString)

  return fingerprint
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// Função para obter informações do dispositivo de forma legível
export function getDeviceInfo(): string {
  const fp = generateDeviceFingerprint()
  
  let deviceInfo = `${fp.platform} - ${fp.screenResolution}`
  
  // Adicionar informações adicionais se disponíveis
  if (fp.hardwareConcurrency > 0) {
    deviceInfo += ` - ${fp.hardwareConcurrency} cores`
  }
  
  if (fp.deviceMemory) {
    deviceInfo += ` - ${fp.deviceMemory}GB RAM`
  }
  
  return deviceInfo
}

