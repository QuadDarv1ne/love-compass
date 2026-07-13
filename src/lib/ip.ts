const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

export function isValidIP(ip: string): boolean {
  if (IPV4_REGEX.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every((p) => p >= 0 && p <= 255);
  }
  if (IPV6_REGEX.test(ip)) {
    return true;
  }
  return false;
}

export function getClientIp(request: Request | { headers: Headers | { get(name: string): string | null } }): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIP = forwarded.split(',')[0]?.trim();
    if (firstIP && isValidIP(firstIP)) {
      return firstIP;
    }
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIP(realIp)) {
    return realIp;
  }
  return '127.0.0.1';
}
