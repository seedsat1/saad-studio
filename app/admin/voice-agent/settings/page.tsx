import { AdminShell } from "@/components/admin/AdminShell";
import { VoiceAgentSettingsPage } from "@/components/voice-agent/VoiceAgentConfigPages";

export default function AdminVoiceAgentSettingsPage() {
  return (
    <AdminShell activeRoute="/admin/voice-agent">
      <VoiceAgentSettingsPage />
    </AdminShell>
  );
}
