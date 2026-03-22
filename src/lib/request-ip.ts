function normalizeIp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === "::1") {
    return "127.0.0.1";
  }

  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7);
  }

  return trimmed;
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const selected = forwardedFor?.split(",")[0] ?? realIp ?? cloudflareIp ?? null;

  return normalizeIp(selected);
}

export function normalizeAllowedMachineIp(value?: string | null) {
  return normalizeIp(value);
}

export function isMachineIpAllowed(allowedMachineIp: string | null | undefined, currentIp: string | null) {
  const normalizedAllowed = normalizeAllowedMachineIp(allowedMachineIp);
  const normalizedCurrent = normalizeAllowedMachineIp(currentIp);

  if (!normalizedAllowed || !normalizedCurrent) {
    return false;
  }

  return normalizedAllowed === normalizedCurrent;
}