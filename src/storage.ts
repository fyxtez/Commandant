import { Store } from "@tauri-apps/plugin-store";
import type { Preset, ServiceEntry } from "./types";

export const MAX_LOG_ENTRIES = 20;

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) storePromise = Store.load("commandant.json");
  return storePromise;
}

export async function loadPresets(): Promise<Preset[]> {
  const store = await getStore();
  return (await store.get<Preset[]>("presets")) ?? [];
}

export async function savePresets(presets: Preset[]): Promise<void> {
  const store = await getStore();
  await store.set("presets", presets);
  await store.save();
}

export async function loadServices(): Promise<ServiceEntry[]> {
  const store = await getStore();
  return (await store.get<ServiceEntry[]>("services")) ?? [];
}

export async function saveServices(services: ServiceEntry[]): Promise<void> {
  const store = await getStore();
  await store.set("services", services);
  await store.save();
}

// One-time migration: convert old single host_config → a "Default" preset.
export async function migrateHostConfig(): Promise<void> {
  const store = await getStore();
  const old = await store.get<any>("host_config");
  if (!old) return;
  const existing = await loadPresets();
  if (existing.length > 0) return; // already migrated
  const preset: Preset = {
    id: crypto.randomUUID(),
    name: "Default",
    host: old.host ?? "",
    port: old.port ?? 22,
    username: old.username ?? "root",
    private_key: old.private_key ?? "",
  };
  await savePresets([preset]);
}
