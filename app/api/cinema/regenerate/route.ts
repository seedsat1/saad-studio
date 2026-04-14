import { NextRequest } from "next/server";
import { POST as generatePOST } from "@/app/api/cinema/generate/route";

export async function POST(req: NextRequest) {
  return generatePOST(req);
}

