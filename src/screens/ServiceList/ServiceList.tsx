import ServiceCard from "../../components/ServiceCard/ServiceCard";
import type { ServiceEntry } from "../../types";
import "./ServiceList.css";

interface Props {
  services: ServiceEntry[];
  activeStatus: Record<string, boolean | null>;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

export default function ServiceList({ services, activeStatus, onOpen, onAdd }: Props) {
  return (
    <div className="service-list">
      <div className="service-list__scroll">
        {services.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            isActive={activeStatus[s.id] ?? null}
            onClick={() => onOpen(s.id)}
          />
        ))}
        <button className="service-list__add-card" onClick={onAdd}>
          <span className="service-list__add-icon">+</span>
          Add new service
        </button>
      </div>
    </div>
  );
}
