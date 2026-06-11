import { NextRequest, NextResponse } from "next/server";
import { isAllowedResource, readData, writeData } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  if (!isAllowedResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }
  const data = await readData(resource);
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  if (!isAllowedResource(resource) || resource === "hero") {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }
  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "expected an array" }, { status: 400 });
  }
  await writeData(resource, body);
  return NextResponse.json(body);
}
