import type { MemberSubscriptionRecord } from "@/lib/contracts";

const memberRegistryStorageKey = "fitnessla.member-registry";
const memberRegistryEventName = "fitnessla.member-registry.changed";

let cachedRawState: string | null | undefined;
let cachedRegistryState: MemberSubscriptionRecord[] = cloneInitialRegistry();

function cloneInitialRegistry() {
  return [] as MemberSubscriptionRecord[];
}

function cloneRegistry(registry: MemberSubscriptionRecord[]) {
  return registry.map((member) => ({ ...member }));
}

function readRawRegistry() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(memberRegistryStorageKey);
}

export function readMemberRegistry() {
  if (typeof window === "undefined") {
    return cloneInitialRegistry();
  }

  const raw = readRawRegistry();

  if (raw === cachedRawState) {
    return cloneRegistry(cachedRegistryState);
  }

  if (!raw) {
    cachedRawState = raw;
    cachedRegistryState = cloneInitialRegistry();
    return cloneRegistry(cachedRegistryState);
  }

  try {
    cachedRawState = raw;
    cachedRegistryState = JSON.parse(raw) as MemberSubscriptionRecord[];
    return cloneRegistry(cachedRegistryState);
  } catch {
    cachedRawState = raw;
    cachedRegistryState = cloneInitialRegistry();
    return cloneRegistry(cachedRegistryState);
  }
}

export function getMemberRegistrySnapshot() {
  if (typeof window === "undefined") {
    return cachedRegistryState;
  }

  const raw = readRawRegistry();

  if (raw === cachedRawState) {
    return cachedRegistryState;
  }

  if (!raw) {
    cachedRawState = raw;
    cachedRegistryState = cloneInitialRegistry();
    return cachedRegistryState;
  }

  try {
    cachedRawState = raw;
    cachedRegistryState = JSON.parse(raw) as MemberSubscriptionRecord[];
    return cachedRegistryState;
  } catch {
    cachedRawState = raw;
    cachedRegistryState = cloneInitialRegistry();
    return cachedRegistryState;
  }
}

export function writeMemberRegistry(nextRegistry: MemberSubscriptionRecord[]) {
  if (typeof window === "undefined") {
    cachedRawState = JSON.stringify(nextRegistry);
    cachedRegistryState = cloneRegistry(nextRegistry);
    return;
  }

  const raw = JSON.stringify(nextRegistry);
  cachedRawState = raw;
  cachedRegistryState = cloneRegistry(nextRegistry);
  window.localStorage.setItem(memberRegistryStorageKey, raw);
  window.dispatchEvent(new Event(memberRegistryEventName));
}

export function prependMemberRegistry(nextMembers: MemberSubscriptionRecord[]) {
  const currentRegistry = readMemberRegistry();
  writeMemberRegistry([...cloneRegistry(nextMembers), ...currentRegistry]);
}

export function resetMemberRegistry() {
  const initialRegistry = cloneInitialRegistry();

  if (typeof window === "undefined") {
    cachedRawState = null;
    cachedRegistryState = initialRegistry;
    return;
  }

  cachedRawState = null;
  cachedRegistryState = initialRegistry;
  window.localStorage.removeItem(memberRegistryStorageKey);
  window.dispatchEvent(new Event(memberRegistryEventName));
}

export function subscribeMemberRegistry(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(memberRegistryEventName, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(memberRegistryEventName, handleChange);
  };
}