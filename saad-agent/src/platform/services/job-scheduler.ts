export interface Job {
  id: string;
  name: string;
  priority: "low" | "medium" | "high" | "critical";
  dependencies?: string[];
  status: "pending" | "running" | "completed" | "failed" | "paused" | "cancelled";
  payload: any;
}

export class JobScheduler {
  private static queue: Job[] = [];
  private static isPaused = false;

  static addJob(job: Omit<Job, "status">): Job {
    const newJob: Job = {
      ...job,
      status: "pending",
    };
    this.queue.push(newJob);
    this.sortQueue();
    return newJob;
  }

  static getJob(id: string): Job | null {
    return this.queue.find((j) => j.id === id) || null;
  }

  static getQueue(): Job[] {
    return [...this.queue];
  }

  static pause(): void {
    this.isPaused = true;
  }

  static resume(): void {
    this.isPaused = false;
  }

  static isQueuePaused(): boolean {
    return this.isPaused;
  }

  static cancelJob(id: string): void {
    const job = this.getJob(id);
    if (job) {
      job.status = "cancelled";
    }
  }

  static updateJobStatus(id: string, status: Job["status"]): void {
    const job = this.getJob(id);
    if (job) {
      job.status = status;
    }
  }

  private static sortQueue(): void {
    const priorityWeights = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    this.queue.sort((a, b) => {
      const weightA = priorityWeights[a.priority];
      const weightB = priorityWeights[b.priority];
      return weightB - weightA; // Higher weight first
    });
  }

  static clearQueue(): void {
    this.queue = [];
    this.isPaused = false;
  }
}
