import { Store } from "@tauri-apps/plugin-store";
import type { HostConfig, ServiceEntry } from "./types";

export const MAX_LOG_ENTRIES = 20;

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = Store.load("commandant.json");
  }
  return storePromise;
}

export async function loadHostConfig(): Promise<HostConfig | null> {
  const store = await getStore();
  return (await store.get<HostConfig>("host_config")) ?? null;
}

export async function saveHostConfig(config: HostConfig): Promise<void> {
  const store = await getStore();
  await store.set("host_config", config);
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
