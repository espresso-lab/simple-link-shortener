const hostname =
  location.hostname === "localhost" ? "http://localhost:3000" : "";

export interface CreateLinkRequest {
  url: string;
  slug: string;
}
export async function createLink(props: CreateLinkRequest) {
  const res = await fetch(`${hostname}/links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(props),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error);
  }
  return res;
}

export async function fetchLinks() {
  const res = await fetch(`${hostname}/links`);
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error);
  }
  return res.json();
}
