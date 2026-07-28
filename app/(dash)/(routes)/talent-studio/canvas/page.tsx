import { redirect } from "next/navigation";
import { TalentStudioAliasProps, withTalentStudioQuery } from "@/lib/talent-studio-redirect";

export const dynamic = "force-dynamic";

export default function TalentStudioCanvasAliasPage({ searchParams }: TalentStudioAliasProps) {
  redirect(withTalentStudioQuery("/influencers/canvas", searchParams));
}
