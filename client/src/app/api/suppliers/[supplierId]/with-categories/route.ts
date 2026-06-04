import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> },
) {
  const { supplierId } = await params;
  const res = await backendFetch(`/suppliers/${supplierId}/with-categories`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
