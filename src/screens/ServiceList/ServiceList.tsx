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
        {services.length === 0 ? (
          <div className="service-list__empty">
            No services yet.
            <br />
            Tap + to add the first one.
          </div>
        ) : (
          services.map((s) => (
            <ServiceCard key={s.id} service={s} onClick={() => onOpen(s.id)} />
          ))
        )}
      </div>
      <button className="service-list__fab" onClick={onAdd} aria-label="Add service">
        +
      </button>
    </div>
  );
}
