import { runFinePassAccuracyTest } from "./adobe/saadstudio-cep/client/src/lib/podcast/services/synchronization-service";

console.log("Running Fine Pass Accuracy Test...");
const result = runFinePassAccuracyTest();

process.exit(result.pass ? 0 : 1);
