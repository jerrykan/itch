import { SteamUserSummary } from "common/types/steam";
import { getTextField, getTextObject, parseTextVdf } from "main/steam/text-vdf";

// Logger-free so it can run under the unit tests; steam-install.ts
// wraps it with the file system reads.

export interface LoginUser {
  accountName: string | null;
  personaName: string | null;
  /** last sign-in, unix seconds; 0 when absent */
  timestamp: number;
  /** "MostRecent" flag, which current clients no longer write */
  mostRecent: boolean;
}

/** loginusers.vdf entries keyed by account id (the userdata folder name) */
export function parseLoginUsers(text: string): Map<string, LoginUser> {
  const users = new Map<string, LoginUser>();
  const table = getTextObject(parseTextVdf(text), "users");
  for (const [steamId64, fields] of table ?? []) {
    if (typeof fields !== "object" || !/^\d+$/.test(steamId64)) {
      continue;
    }
    const str = (name: string): string | null => {
      const v = getTextField(fields, name);
      return typeof v === "string" && v !== "" ? v : null;
    };
    // steamid64 -> account id
    const id = (BigInt(steamId64) & 0xffffffffn).toString();
    users.set(id, {
      accountName: str("AccountName"),
      personaName: str("PersonaName"),
      timestamp: parseInt(str("Timestamp") ?? "0", 10) || 0,
      mostRecent: str("MostRecent") === "1",
    });
  }
  return users;
}

/**
 * Orders userdata folders best default first. The default is only a
 * guess for the dialog's picker: the "MostRecent" flag when present
 * (older clients), else the latest sign-in timestamp, else the folder
 * whose localconfig.vdf was touched last. Folders with no loginusers.vdf
 * entry (stale accounts) sort last, without names.
 */
export function rankSteamUsers(
  folders: string[],
  loginUsers: Map<string, LoginUser>,
  lastActiveAt: (id: string) => number
): SteamUserSummary[] {
  const ranked = folders.map((id) => {
    const login = loginUsers.get(id);
    return {
      id,
      login,
      rank: [
        login?.mostRecent ? 1 : 0,
        login?.timestamp ?? 0,
        lastActiveAt(id),
      ],
    };
  });
  ranked.sort((a, b) => {
    for (let i = 0; i < a.rank.length; i++) {
      if (a.rank[i] !== b.rank[i]) {
        return b.rank[i] - a.rank[i];
      }
    }
    return a.id.localeCompare(b.id);
  });
  return ranked.map(({ id, login }) => ({
    id,
    accountName: login?.accountName ?? null,
    personaName: login?.personaName ?? null,
  }));
}
