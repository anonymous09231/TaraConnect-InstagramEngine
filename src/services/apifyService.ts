import { InstagramProfile } from "../types";

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;
const ACTOR_ID = "apify~instagram-followers-count-scraper";
const APIFY_BASE = "https://api.apify.com/v2";

function checkToken() {
  if (!APIFY_TOKEN) {
    throw new Error("Apify API Token is missing. Please set VITE_APIFY_TOKEN in your environment variables.");
  }
}

export function parseUsername(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?/);
  if (urlMatch) return urlMatch[1].toLowerCase();
  if (trimmed.startsWith("@")) return trimmed.slice(1).toLowerCase();
  return trimmed.toLowerCase();
}

async function waitForRun(runId: string): Promise<Record<string, unknown>> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const json = (await res.json()) as { data: Record<string, unknown> };
    const run = json.data;
    if (run.status === "SUCCEEDED") return run;
    if (run.status === "FAILED" || run.status === "ABORTED" || run.status === "TIMED-OUT")
      throw new Error(`Apify run ${run.status}. Please try again.`);
  }
  throw new Error("Apify run timed out. Please try again.");
}

function mapItem(item: Record<string, unknown>, fallbackUsername = ""): InstagramProfile {
  const uname = (item.username as string) || fallbackUsername;
  return {
    username: uname,
    displayName: (item.fullName as string) || (item.full_name as string) || uname,
    bio: (item.biography as string) || (item.bio as string) || "",
    profilePic:
      (item.profilePicUrlHD as string) ||
      (item.profilePicUrl as string) ||
      (item.profile_pic_url_hd as string) ||
      (item.profile_pic_url as string) ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(uname)}&background=random&size=150`,
    followers:
      (item.followersCount as number) ||
      (item.followers_count as number) ||
      ((item.edge_followed_by as { count?: number })?.count) ||
      0,
    following:
      (item.followsCount as number) ||
      (item.follows_count as number) ||
      ((item.edge_follow as { count?: number })?.count) ||
      0,
    posts:
      (item.postsCount as number) ||
      (item.posts_count as number) ||
      ((item.edge_owner_to_timeline_media as { count?: number })?.count) ||
      0,
    isVerified: Boolean(item.verified || item.is_verified),
    isPrivate: Boolean(item.isPrivate || item.is_private),
    category: (item.businessCategoryName as string) || (item.category as string) || "",
    externalUrl: (item.externalUrl as string) || (item.external_url as string) || undefined,
  };
}

export async function fetchProfile(input: string): Promise<InstagramProfile> {
  checkToken();
  const username = parseUsername(input);
  if (!username) throw new Error("Please enter a valid username or profile URL.");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username))
    throw new Error(`"${username}" doesn't look like a valid Instagram username.`);

  const startRes = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username] }),
  });
  if (!startRes.ok) throw new Error(`Failed to start Apify scraper (HTTP ${startRes.status}).`);

  const startJson = (await startRes.json()) as { data: Record<string, unknown> };
  const runId = startJson.data.id as string;
  const defaultDatasetId = startJson.data.defaultDatasetId as string;

  await waitForRun(runId);

  const dataRes = await fetch(`${APIFY_BASE}/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}&clean=true`);
  if (!dataRes.ok) throw new Error(`Failed to fetch results (HTTP ${dataRes.status}).`);

  const items = (await dataRes.json()) as Record<string, unknown>[];
  if (!items || items.length === 0)
    throw new Error(`@${username} was not found or has no data. The account may be private, banned, or misspelled.`);

  return mapItem(items[0], username);
}

export async function fetchProfilesBulk(inputs: string[]): Promise<InstagramProfile[]> {
  checkToken();
  const usernames = inputs.map(parseUsername).filter(Boolean);
  if (usernames.length === 0) throw new Error("No valid usernames provided.");

  const startRes = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames }),
  });
  if (!startRes.ok) throw new Error(`Failed to start Apify scraper (HTTP ${startRes.status}).`);

  const startJson = (await startRes.json()) as { data: Record<string, unknown> };
  const runId = startJson.data.id as string;
  const defaultDatasetId = startJson.data.defaultDatasetId as string;

  await waitForRun(runId);

  const dataRes = await fetch(`${APIFY_BASE}/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}&clean=true`);
  if (!dataRes.ok) throw new Error(`Failed to fetch bulk results (HTTP ${dataRes.status}).`);

  const items = (await dataRes.json()) as Record<string, unknown>[];
  return items.map((item) => mapItem(item));
}
