import { execSync } from "child_process";
import { CONFIG } from "../config.js";
export function runCommand(command) {
    console.log(`$ ${command}`);
    try {
        const output = execSync(command, {
            cwd: CONFIG.PROJECT_ROOT,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        console.log(output);
        return output;
    }
    catch (error) {
        console.error(error.stdout?.toString() || error.stderr?.toString() || error.message);
        throw error;
    }
}
export function gitDiff() {
    try {
        return runCommand("git diff");
    }
    catch {
        return "No changes detected or not a git repository";
    }
}
//# sourceMappingURL=command-runner.js.map