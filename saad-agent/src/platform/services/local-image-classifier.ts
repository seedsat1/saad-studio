import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface LocalImageClassifierStatus {
  available: boolean;
  modelPath: string;
  backend: "local_model" | "not_configured";
  reason?: string;
}

export class LocalImageClassifierService {
  static modelPath(): string {
    const envPath = process.env["SAAD_AGENT_IMAGE_CLASSIFIER_PATH"];
    if (envPath && envPath.trim()) {
      return envPath.trim();
    }

    const resourcesPath = (process as any).resourcesPath;
    const packagedPath = resourcesPath
      ? path.join(resourcesPath, "models", "image-classifier")
      : "";
    if (packagedPath && fs.existsSync(packagedPath)) {
      return packagedPath;
    }

    const projectRoot = CONFIG.PROJECT_ROOT;
    const agentRoot = path.basename(projectRoot).toLowerCase() === "saad-agent"
      ? projectRoot
      : path.join(projectRoot, "saad-agent");
    return path.join(agentRoot, "resources", "models", "image-classifier");
  }

  static getStatus(): LocalImageClassifierStatus {
    const modelPath = this.modelPath();
    if (!fs.existsSync(modelPath)) {
      return {
        available: false,
        modelPath,
        backend: "not_configured",
        reason: "No local image classification model is installed."
      };
    }

    return {
      available: true,
      modelPath,
      backend: "local_model"
    };
  }
}
