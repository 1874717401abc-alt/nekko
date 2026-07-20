import type { ItemResourceName } from "@/lib/store";

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.error ?? "操作失败，请重试。";
}

export async function createItem<T>(
  resource: ItemResourceName,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`/api/data/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function patchItem<T>(
  resource: ItemResourceName,
  id: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`/api/data/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteItem(resource: ItemResourceName, id: string): Promise<void> {
  const res = await fetch(`/api/data/${resource}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function appendTaskEntry<T>(
  taskId: string,
  kind: "logs" | "comments",
  content: string
): Promise<T> {
  const res = await fetch(`/api/data/progress/${taskId}/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
