export interface HostConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  private_key: string;
}

export type ActionKind = "start" | "stop" | "restart" | "logs";

export interface ActionLogEntry {
  timestamp: string;
  action: ActionKind;
  success: boolean;
  exit_code: number | null;
  message: string;
}

export interface ServiceEntry {
  id: string;
  label: string;
  unit_name: string;
  preset_id: string;
  log: ActionLogEntry[];
}
