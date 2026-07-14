import { NextRequest } from "next/server";
import { handleShareProPost } from "@/lib/professional-library/share-pro-handler";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleShareProPost(req, params.id);
}
