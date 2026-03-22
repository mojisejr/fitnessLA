import { createHash, randomBytes } from "crypto";

export const ATTENDANCE_DEVICE_COOKIE = "attendance_device_token";
export const ATTENDANCE_DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export function createAttendanceDeviceToken() {
  return randomBytes(32).toString("hex");
}

export function hashAttendanceDeviceToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAttendanceDeviceTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const segment of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = segment.trim().split("=");
    if (rawName === ATTENDANCE_DEVICE_COOKIE) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

export function getRequestUserAgent(request: Request) {
  const userAgent = request.headers.get("user-agent")?.trim();
  return userAgent && userAgent.length > 0 ? userAgent : null;
}