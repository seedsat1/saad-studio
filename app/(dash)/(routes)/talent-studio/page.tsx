import { redirect } from "next/navigation";
import { TalentStudioAliasProps, withTalentStudioQuery } from "@/lib/talent-studio-redirect";

export const dynamic = "force-dynamic";

export default function TalentStudioAliasPage({ searchParams }: TalentStudioAliasProps) {
  redirect(withTalentStudioQuery("/influencers", searchParams));
}
