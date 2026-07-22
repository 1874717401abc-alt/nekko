import { rm } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "project-assets");

export async function removeProjectAssetFile(storedName: unknown) {
  if (typeof storedName !== "string" || storedName !== path.basename(storedName)) return;
  await rm(path.join(UPLOAD_DIR, storedName), { force: true }).catch(() => undefined);
}
