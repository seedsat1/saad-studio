export class LocalCreativeProvider {
    id = "provider-local";
    name = "Local Offline Generator";
    type = "local";
    capabilities = [
        "text-to-image",
        "image-to-image",
        "image-editing",
        "storyboard",
    ];
    costMode = "free";
    requiresApproval = true;
    jobs = new Map();
    async generate(task) {
        const jobId = `job-local-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const statusRecord = {
            jobId,
            status: "failed",
            progress: 0,
            error: "Local creative generation is not configured. No placeholder image was generated."
        };
        this.jobs.set(jobId, statusRecord);
        return statusRecord;
    }
    async getJobStatus(jobId) {
        return this.jobs.get(jobId) || { jobId, status: "failed", progress: 0, error: "Job not found" };
    }
    async retrieveAsset(jobId) {
        const job = this.jobs.get(jobId);
        return job?.asset || null;
    }
}
export class SaadStudioCreativeProvider {
    id = "provider-saad-studio";
    name = "Saad Studio AI Suite";
    type = "saad_studio";
    capabilities = [
        "text-to-image",
        "image-to-image",
        "image-editing",
        "storyboard",
    ];
    costMode = "credits";
    requiresApproval = true;
    jobs = new Map();
    async generate(task) {
        const jobId = `job-saad-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const statusRecord = {
            jobId,
            status: "failed",
            progress: 0,
            error: "Saad Studio creative generation is not connected to the authenticated panel/KIE pipeline yet. No placeholder image was generated."
        };
        this.jobs.set(jobId, statusRecord);
        return statusRecord;
    }
    async getJobStatus(jobId) {
        return this.jobs.get(jobId) || { jobId, status: "failed", progress: 0, error: "Job not found" };
    }
    async retrieveAsset(jobId) {
        const job = this.jobs.get(jobId);
        return job?.asset || null;
    }
}
//# sourceMappingURL=creative-providers.js.map