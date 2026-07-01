import "./ServiceCard.css";
import type { ServiceEntry } from "../../types";

interface Props {
  service: ServiceEntry;
  isActive: boolean | null;
  onClick: () => void;
}

export default function ServiceCard({ service, isActive, onClick }: Props) {
  const kind =
    isActive === true ? "ok" : isActive === false ? "danger" : "idle";
  const label =
    isActive === true ? "active" : isActive === false ? "inactive" : "unknown";

  return (
    <div className="service-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="service-card__info">
        <span className="service-card__label">{service.label}</span>
        <span className="service-card__unit">{service.unit_name}</span>
      </div>
      <div className={`service-card__status service-card__status--${kind}`}>
        <span className={`service-card__dot service-card__dot--${kind}`} />
        <span className="service-card__status-label">{label}</span>
      </div>
    </div>
  );
}
