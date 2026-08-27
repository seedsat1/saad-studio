import { AdminShell } from "@/components/admin/AdminShell";
import { VoiceAgentWorkspace } from "@/components/voice-agent/VoiceAgentWorkspace";

export default function AdminVoiceAgentPage() {
  return (
    <AdminShell activeRoute="/admin/voice-agent">
      <VoiceAgentWorkspace />
    </AdminShell>
  );
}
