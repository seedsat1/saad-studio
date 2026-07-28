import { redirect } from "next/navigation";
import { TalentStudioAliasProps, withTalentStudioQuery } from "@/lib/talent-studio-redirect";

export const dynamic = "force-dynamic";

export default function TalentStudioUpscaleAliasPage({ searchParams }: TalentStudioAliasProps) {
  redirect(withTalentStudioQuery("/influencers/upscale", searchParams));
}
