import { execFileSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { processes } from "systeminformation";
import { mainLogger } from "main/logger";
import {
  LoginUser,
  parseLoginUsers,
  rankSteamUsers,
} from "main/steam/steam-users";
import { SteamUserSummary } from "common/types/steam";

const logger = mainLogger.child(__filename);

// only hits are cached: a miss is re-queried so a Steam installed while
// the app runs is still found
let registrySteamPath: string | undefined;

function windowsRegistrySteamPath(): string | null {
  if (registrySteamPath !== undefined) {
    return registrySteamPath;
  }
  try {
    const out = execFileSync(
      "reg",
      ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"],
      { encoding: "utf8" }
    );
    const m = /SteamPath\s+REG_SZ\s+(.+)/.exec(out);
    if (m) {
      registrySteamPath = m[1].trim();
      return registrySteamPath;
    }
  } catch (e) {
    // no registry entry, or reg.exe unavailable
  }
  return null;
}

export function getSteamRoot(): string | null {
  const candidates: string[] = [];
  switch (process.platform) {
    case "win32": {
      // registry first: a custom-drive install must win over a stale
      // leftover at the default path
      const fromRegistry = windowsRegistrySteamPath();
      if (fromRegistry) {
        candidates.push(fromRegistry);
      }
      candidates.push(
        join(
          process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
          "Steam"
        ),
        join(process.env["ProgramFiles"] || "C:\\Program Files", "Steam")
      );
      break;
    }
    case "darwin":
      candidates.push(
        join(homedir(), "Library", "Application Support", "Steam")
      );
      break;
    case "linux":
      candidates.push(
        join(homedir(), ".steam", "steam"),
        join(homedir(), ".local", "share", "Steam"),
        join(
          homedir(),
          ".var",
          "app",
          "com.valvesoftware.Steam",
          ".local",
          "share",
          "Steam"
        )
      );
      break;
  }

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "userdata"))) {
      return candidate;
    }
  }
  return null;
}

/**
 * Accounts with a userdata folder, joined with loginusers.vdf for names,
 * best default first; see rankSteamUsers for how the default is chosen.
 */
export function listSteamUsers(root: string): SteamUserSummary[] {
  const userdata = join(root, "userdata");
  let folders: string[];
  try {
    folders = readdirSync(userdata, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => name !== "0" && name !== "ac" && /^\d+$/.test(name))
      // Steam creates config/ on an account's first real session. A
      // folder without one is left over from a login that never
      // completed and holds nothing to manage.
      .filter((name) => existsSync(join(userdata, name, "config")));
  } catch (e) {
    logger.warn(`could not list ${userdata}: ${e}`);
    return [];
  }
  if (folders.length === 0) {
    return [];
  }

  let loginUsers = new Map<string, LoginUser>();
  try {
    loginUsers = parseLoginUsers(
      readFileSync(join(root, "config", "loginusers.vdf"), "utf8")
    );
  } catch (e) {
    // missing (never signed in with "remember me") or unparsable: the
    // folders still list, unnamed
    logger.warn(`could not read loginusers.vdf: ${e}`);
  }
  // Steam rewrites localconfig.vdf throughout a session, so the newest
  // one belongs to the account that was signed in last
  const lastActiveAt = (id: string): number => {
    try {
      return statSync(join(userdata, id, "config", "localconfig.vdf")).mtimeMs;
    } catch (e) {
      return -1;
    }
  };
  const users = rankSteamUsers(folders, loginUsers, lastActiveAt);
  if (users.length > 1) {
    logger.info(
      `${users.length} Steam accounts in ${userdata}, defaulting to ${users[0].id}`
    );
  }
  return users;
}

export async function isSteamRunning(): Promise<boolean> {
  const { list } = await processes();
  return list.some((p) => {
    const name = (p.name || "").toLowerCase();
    return name === "steam" || name === "steam.exe" || name === "steam_osx";
  });
}
