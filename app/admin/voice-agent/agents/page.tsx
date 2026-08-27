import { AdminShell } from "@/components/admin/AdminShell";
import { VoiceAgentAgentsPage } from "@/components/voice-agent/VoiceAgentConfigPages";

export default function AdminVoiceAgentAgentsPage() {
  return (
    <AdminShell activeRoute="/admin/voice-agent">
      <VoiceAgentAgentsPage />
    </AdminShell>
  );
}
