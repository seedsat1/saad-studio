import { AdminShell } from "@/components/admin/AdminShell";
import { TaskDetailView } from "@/components/voice-agent/TaskDetailView";

export default function AdminVoiceAgentTaskPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell activeRoute="/admin/voice-agent">
      <TaskDetailView taskId={params.id} />
    </AdminShell>
  );
}
