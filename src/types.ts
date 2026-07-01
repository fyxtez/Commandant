export interface HostConfig {
  host: string;
  port: number;
  username: string;
  private_key: string;
}

export type ActionKind = "start" | "stop" | "restart" | "logs";

export interface ActionLogEntry {
  timestamp: string; // ISO string
  action: ActionKind;
  success: boolean;
  exit_code: number | null;
  message: string;
}

export interface ServiceEntry {
  id: string;
  label: string;
  unit_name: string;
  log: ActionLogEntry[];
}
