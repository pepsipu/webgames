export async function uploadGameFile(text: string): Promise<void> {
  const response = await fetch("/api/gamefile", {
    method: "PUT",
    headers: {
      "Content-Type": "text/plain",
    },
    body: text,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
