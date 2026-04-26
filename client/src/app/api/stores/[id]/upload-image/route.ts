import { fetchStoreEditData } from "@/lib/store-edit-load";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: storeId } = await params;

  const storeData = await fetchStoreEditData(storeId);
  if (!storeData.ok) {
    return Response.json(
      { error: "Store not found or unauthorized" },
      { status: storeData.status },
    );
  }

  const { url: storeUrl, port, consumerKey, consumerSecret } = storeData.data;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  /* Build base URL — insert port into the hostname, not the path */
  let wpBase: string;
  try {
    const urlObj = new URL(storeUrl.replace(/\/$/, ""));
    if (port && !urlObj.port) {
      urlObj.port = String(port);
    }
    wpBase = urlObj.toString().replace(/\/$/, "");
  } catch {
    wpBase = storeUrl.replace(/\/$/, "");
  }
  const uploadUrl = `${wpBase}/wp-json/wp/v2/media`;

  console.log("[upload-image] uploading to:", uploadUrl);

  /* Prefer explicit WP credentials (Application Password) if provided */
  const wpUser = req.headers.get("x-wp-user") ?? "";
  const wpPass = req.headers.get("x-wp-pass") ?? "";
  const authPair =
    wpUser && wpPass
      ? `${wpUser}:${wpPass}`
      : `${consumerKey}:${consumerSecret}`;
  const auth = Buffer.from(authPair).toString("base64");
  const fileBuffer = await file.arrayBuffer();

  let wpRes: Response;
  try {
    wpRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileBuffer,
    });
  } catch (err) {
    const detail = String(err);
    console.error("[upload-image] fetch error:", detail, "→ url:", uploadUrl);
    return Response.json(
      { error: `לא ניתן להגיע לאתר הוורדפרס (${uploadUrl}). פרטים: ${detail}` },
      { status: 502 },
    );
  }

  if (!wpRes.ok) {
    const body = await wpRes.text();
    let msg = body;
    try {
      const j = JSON.parse(body) as { message?: string };
      msg = j.message ?? body;
    } catch {
      /* use raw text */
    }
    return Response.json({ error: msg }, { status: wpRes.status });
  }

  const json = (await wpRes.json()) as {
    source_url?: string;
    guid?: { rendered?: string };
    link?: string;
  };
  const imageUrl = json.source_url ?? json.guid?.rendered ?? json.link ?? null;

  if (!imageUrl) {
    return Response.json(
      { error: "Upload succeeded but no URL returned" },
      { status: 502 },
    );
  }

  return Response.json({ url: imageUrl });
}
