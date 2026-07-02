import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import TopBar from "./components/TopBar/TopBar";
import Presets from "./screens/Presets/Presets";
import PresetForm from "./screens/PresetForm/PresetForm";
import ServiceList from "./screens/ServiceList/ServiceList";
import AddService from "./screens/AddService/AddService";
import ServiceDetail from "./screens/ServiceDetail/ServiceDetail";
import {
  loadHostConfig,
  loadServices,
  migrateHostConfig,
  saveHostConfig,
  saveServices,
  MAX_LOG_ENTRIES,
} from "./storage";
import type { ActionLogEntry, HostConfig, ServiceEntry } from "./types";
import "./App.css";

type Route =
  | { name: "list" }
  | { name: "presets" }
  | { name: "preset_form"; id?: string }
  | { name: "add" }
  | { name: "detail"; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "list" });
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [presets, setPresets] = useState<HostConfig[]>([]);
  const [activeStatus, setActiveStatus] = useState<Record<string, boolean | null>>({});
  const [loaded, setLoaded] = useState(false);

  // Keep a ref so the polling interval always sees current services
  const servicesRef = useRef<ServiceEntry[]>([]);
  useEffect(() => { servicesRef.current = services; }, [services]);

  useEffect(() => {
    async function init() {
      await migrateHostConfig();
      const [p, s] = await Promise.all([loadHostConfig(), loadServices()]);
      setPresets(p);
      setServices(s);
      servicesRef.current = s;
      setLoaded(true);
    }
    init();
  }, []);

  // Poll active status on load + every 10 minutes
  useEffect(() => {
    if (!loaded) return;
    const doCheck = () => checkAllActive(servicesRef.current);
    doCheck();
    const interval = setInterval(doCheck, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loaded]);

  async function checkAllActive(svcs: ServiceEntry[]) {
    await Promise.all(
      svcs
        .filter((s) => s.preset_id)
        .map(async (svc) => {
          try {
            const active = await invoke<boolean>("check_service_active", {
              presetId: svc.preset_id,
              unitName: svc.unit_name,
            });
            setActiveStatus((prev) => ({ ...prev, [svc.id]: active }));
          } catch {
            setActiveStatus((prev) => ({ ...prev, [svc.id]: null }));
          }
        })
    );
  }

  async function persistServices(next: ServiceEntry[]) {
    setServices(next);
    servicesRef.current = next;
    await saveServices(next);
  }

  async function persistPresets(next: HostConfig[]) {
    setPresets(next);
    await saveHostConfig(next);
  }

  function handleSavePreset(preset: HostConfig) {
    const exists = presets.some((p) => p.id === preset.id);
    const next = exists
      ? presets.map((p) => (p.id === preset.id ? preset : p))
      : [...presets, preset];
    persistPresets(next);
    setRoute({ name: "presets" });
  }

  function handleDeletePreset(presetId: string) {
    persistPresets(presets.filter((p) => p.id !== presetId));
  }

  function handleAddService(label: string, unitName: string, presetId: string) {
    const entry: ServiceEntry = {
      id: crypto.randomUUID(),
      label,
      unit_name: unitName,
      preset_id: presetId,
      log: [],
    };
    const next = [...services, entry];
    persistServices(next);
    setRoute({ name: "list" });
    // Check new service status immediately
    invoke<boolean>("check_service_active", {
      presetId,
      unitName,
    })
      .then((active) =>
        setActiveStatus((prev) => ({ ...prev, [entry.id]: active }))
      )
      .catch(() => {});
  }

  function handleDeleteService(serviceId: string) {
    persistServices(services.filter((s) => s.id !== serviceId));
    setActiveStatus((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
    setRoute({ name: "list" });
  }

  function handleClearHistory(serviceId: string) {
    persistServices(
      services.map((s) => (s.id === serviceId ? { ...s, log: [] } : s))
    );
  }

  function handleLogAppended(serviceId: string, logEntry: ActionLogEntry) {
    persistServices(
      services.map((s) => {
        if (s.id !== serviceId) return s;
        const log = [...s.log, logEntry].slice(-MAX_LOG_ENTRIES);
        return { ...s, log };
      })
    );
  }

  function handleStatusUpdated(serviceId: string, active: boolean | null) {
    setActiveStatus((prev) => ({ ...prev, [serviceId]: active }));
  }

  const activeService =
    route.name === "detail"
      ? services.find((s) => s.id === route.id) ?? null
      : null;

  const editingPreset =
    route.name === "preset_form" && route.id
      ? presets.find((p) => p.id === route.id)
      : undefined;

  const topBarTitle =
    route.name === "presets"
      ? "HOSTS"
      : route.name === "preset_form"
      ? editingPreset
        ? "Edit Preset"
        : "New Preset"
      : route.name === "add"
      ? "Add Service"
      : route.name === "detail" && activeService
      ? activeService.label
      : "Commandant";

  return (
    <div className="app">
      <TopBar
        title={topBarTitle}
        showDot={route.name === "list"}
        onSettings={
          route.name === "list"
            ? () => setRoute({ name: "presets" })
            : undefined
        }
      />

      {route.name === "presets" && (
        <Presets
          presets={presets}
          onAdd={() => setRoute({ name: "preset_form" })}
          onEdit={(id:any) => setRoute({ name: "preset_form", id })}
          onDelete={handleDeletePreset}
          onClose={() => setRoute({ name: "list" })}
        />
      )}

      {route.name === "preset_form" && (
        <PresetForm
          preset={editingPreset}
          onSave={handleSavePreset}
          onCancel={() =>
            setRoute(presets.length === 0 ? { name: "list" } : { name: "presets" })
          }
        />
      )}

      {route.name === "list" && (
        <ServiceList
          services={services}
          activeStatus={activeStatus}
          onOpen={(id) => setRoute({ name: "detail", id })}
          onAdd={() => setRoute({ name: "add" })}
        />
      )}

      {route.name === "add" && (
        <AddService
          presets={presets}
          onCancel={() => setRoute({ name: "list" })}
          onSave={handleAddService}
          onOpenHosts={() => setRoute({ name: "presets" })}
        />
      )}

      {route.name === "detail" && activeService && (
        <ServiceDetail
          service={activeService}
          preset={presets.find((p) => p.id === activeService.preset_id) ?? null}
          isActive={activeStatus[activeService.id] ?? null}
          onBack={() => setRoute({ name: "list" })}
          onLogAppended={(entry) => handleLogAppended(activeService.id, entry)}
          onClearHistory={() => handleClearHistory(activeService.id)}
          onDelete={() => handleDeleteService(activeService.id)}
          onStatusUpdated={(active) => handleStatusUpdated(activeService.id, active)}
        />
      )}
    </div>
  );
}
