import "./ServiceCard.css";
import type { ServiceEntry } from "../../types";

interface Props {
  service: ServiceEntry;
  onClick: () => void;
}

type StatusKind = "ok" | "danger" | "idle";

function deriveStatus(service: ServiceEntry): { label: string; kind: StatusKind } {
  const last = service.log[service.log.length - 1];
  if (!last) return { label: "no history", kind: "idle" };

  if (!last.success) return { label: "failed", kind: "danger" };

  if (last.action === "stop") return { label: "stopped", kind: "idle" };
  if (last.action === "logs") return { label: "logs fetched", kind: "idle" };
  if (last.action === "start") return { label: "started", kind: "ok" };
  if (last.action === "restart") return { label: "restarted", kind: "ok" };

  return { label: "ok", kind: "ok" };
}

export default function ServiceCard({ service, onClick }: Props) {
  const status = deriveStatus(service);

  return (
    <div className="service-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="service-card__info">
        <span className="service-card__label">{service.label}</span>
        <span className="service-card__unit">{service.unit_name}</span>
      </div>
      <span className={`service-card__pill service-card__pill--${status.kind}`}>
        {status.label}
      </span>
    </div>
  );
}
