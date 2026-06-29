import { execSync } from "child_process";

export interface RecoveryStepResult {
  actionTaken: "rollback" | "retry" | "alternative_plan" | "ask_user";
  success: boolean;
  message: string;
  rollbackLogs?: string;
}

export class RecoveryEngineService {
  static executeRealRollback(workspacePath = process.cwd()): { success: boolean; logs: string } {
    try {
      const statusOut = execSync("git status --porcelain", { cwd: workspacePath, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      if (!statusOut) {
        return { success: true, logs: "No uncommitted changes detected in git status. Skipping rollback stash." };
      }

      const stashName = `saad_backup_${Date.now()}`;
      const stdout = execSync(`git stash save "${stashName}"`, { cwd: workspacePath, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      return { success: true, logs: `Created backup stash '${stashName}'. Stashed changes:\n${statusOut}` };
    } catch (err: any) {
      return { success: false, logs: err.message };
    }
  }

  static handleExecutionFailure(error: Error, retryCount = 0, workspacePath = process.cwd()): RecoveryStepResult {
    if (retryCount === 0) {
      return {
        actionTaken: "retry",
        success: true,
        message: `Attempting self-fix retry (Attempt 1): ${error.message}`,
      };
    } else if (retryCount === 1) {
      const rollbackRes = this.executeRealRollback(workspacePath);
      return {
        actionTaken: "rollback",
        success: rollbackRes.success,
        message: `Recovery rollback status: ${rollbackRes.logs}`,
        rollbackLogs: rollbackRes.logs,
      };
    } else {
      return {
        actionTaken: "ask_user",
        success: false,
        message: `Execution failed after retries and recovery checks: ${error.message}`,
      };
    }
  }
}
