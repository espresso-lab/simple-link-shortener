const hostname =
  location.hostname === "localhost" ? "http://localhost:3000" : "";

export interface CreateLinkRequest {
  targetUrl: string;
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
    throw new Error(await res.json());
  }
  return;
}

export async function fetchLinks() {
  const res = await fetch(`${hostname}/links`);
  if (!res.ok) {
    throw new Error(await res.json());
  }
  return res.json();
}

export async function fetchClicksForSlug(slug: string) {
  const res = await fetch(`${hostname}/links/${slug}/clicks`);
  if (!res.ok) {
    throw new Error(await res.json());
  }
  return res.json();
}

export async function deleteLink(slug: string) {
  const res = await fetch(`${hostname}/links/${slug}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await res.json());
  }
  return;
}
