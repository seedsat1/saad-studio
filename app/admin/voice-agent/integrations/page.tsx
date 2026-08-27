import { AdminShell } from "@/components/admin/AdminShell";
import { VoiceAgentIntegrationsPage } from "@/components/voice-agent/VoiceAgentConfigPages";

export default function AdminVoiceAgentIntegrationsPage() {
  return (
    <AdminShell activeRoute="/admin/voice-agent">
      <VoiceAgentIntegrationsPage />
    </AdminShell>
  );
}
