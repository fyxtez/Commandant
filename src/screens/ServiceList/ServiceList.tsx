import ServiceCard from "../../components/ServiceCard/ServiceCard";
import type { ServiceEntry } from "../../types";
import "./ServiceList.css";

interface Props {
  services: ServiceEntry[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}

export default function ServiceList({ services, onOpen, onAdd }: Props) {
  return (
    <div className="service-list">
      <div className="service-list__scroll">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} onClick={() => onOpen(s.id)} />
        ))}
        <button className="service-list__add-card" onClick={onAdd}>
          <span className="service-list__add-icon">+</span>
          Add new service
        </button>
      </div>
    </div>
  );
}
