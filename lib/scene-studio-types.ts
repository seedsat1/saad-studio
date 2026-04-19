export interface Scene {
  id: string;
  image: string | null;
  imageFile: File | null;
  prompt: string;
  cameraMove: CameraMoveId;
  duration: number;
  status: SceneStatus;
  taskId: string | null;
  outputUrl: string | null;
  outputType: "video" | "image" | null;
  error: string | null;
  fileName: string | null;
}

export type SceneStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "running"
  | "success"
  | "failed";

export type CameraMoveId =
  | "static"
  | "pan_left"
  | "pan_right"
  | "tilt_up"
  | "tilt_down"
  | "zoom_in"
  | "zoom_out"
  | "dolly_in"
  | "orbit"
  | "crane_up"
  | "tracking"
  | "handheld";

export interface CameraMove {
  id: CameraMoveId;
  label: string;
  icon: string;
  desc: string;
}

export interface LogEntry {
  time: string;
  msg: string;
  type: "info" | "error" | "success";
}
