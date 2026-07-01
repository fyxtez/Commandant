import { useEffect, useState } from "react";
import TopBar from "./components/TopBar/TopBar";
import Settings from "./screens/Settings/Settings";
import ServiceList from "./screens/ServiceList/ServiceList";
import AddService from "./screens/AddService/AddService";
import ServiceDetail from "./screens/ServiceDetail/ServiceDetail";
import { loadHostConfig, loadServices, saveServices, MAX_LOG_ENTRIES } from "./storage";
import type { ActionLogEntry, ServiceEntry } from "./types";
import "./App.css";

type Route =
  | { name: "settings" }
  | { name: "list" }
  | { name: "add" }
  | { name: "detail"; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "list" });
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [hasHost, setHasHost] = useState<boolean | null>(null);

  useEffect(() => {
    loadHostConfig().then((cfg) => setHasHost(!!cfg));
    loadServices().then(setServices);
  }, []);

  // First launch — no host configured yet → go straight to Settings.
  useEffect(() => {
    if (hasHost === false) setRoute({ name: "settings" });
  }, [hasHost]);

  async function persist(next: ServiceEntry[]) {
    setServices(next);
    await saveServices(next);
  }

  function handleAddService(label: string, unitName: string) {
    const entry: ServiceEntry = {
      id: crypto.randomUUID(),
      label,
      unit_name: unitName,
      log: [],
    };
    persist([...services, entry]);
    setRoute({ name: "list" });
  }

  function handleClearHistory(serviceId: string) {
    const next = services.map((s) =>
      s.id === serviceId ? { ...s, log: [] } : s
    );
    persist(next);
  }

  function handleLogAppended(serviceId: string, logEntry: ActionLogEntry) {
    const next = services.map((s) => {
      if (s.id !== serviceId) return s;
      const log = [...s.log, logEntry].slice(-MAX_LOG_ENTRIES);
      return { ...s, log };
    });
    persist(next);
  }

  const activeService =
    route.name === "detail"
      ? services.find((s) => s.id === route.id) ?? null
      : null;

  const topBarTitle =
    route.name === "settings"
      ? "Settings"
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
        onSettings={route.name === "list" ? () => setRoute({ name: "settings" }) : undefined}
      />

      {route.name === "settings" && (
        <Settings
          onClose={() => setRoute({ name: "list" })}
          onSaved={() => {
            setHasHost(true);
            setRoute({ name: "list" });
          }}
        />
      )}

      {route.name === "list" && (
        <ServiceList
          services={services}
          onOpen={(id) => setRoute({ name: "detail", id })}
          onAdd={() => setRoute({ name: "add" })}
        />
      )}

      {route.name === "add" && (
        <AddService
          onCancel={() => setRoute({ name: "list" })}
          onSave={handleAddService}
        />
      )}

      {route.name === "detail" && activeService && (
        <ServiceDetail
          service={activeService}
          onBack={() => setRoute({ name: "list" })}
          onLogAppended={(entry) => handleLogAppended(activeService.id, entry)}
          onClearHistory={() => handleClearHistory(activeService.id)}
        />
      )}
    </div>
  );
}
