import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLoginUsers, rankSteamUsers } from "main/steam/steam-users";

// 76561197968778704 -> 8512976, 76561198300668933 -> 340403205
const loginUsers = (extra: string) => `"users"
{
\t"76561197968778704"
\t{
\t\t"accountname"\t\t"alice"
\t\t"PersonaName"\t\t"Alice"
\t\t"RememberPassword"\t\t"1"
\t\t"Timestamp"\t\t"1700000000"${extra}
\t}
\t"76561198300668933"
\t{
\t\t"AccountName"\t\t"bob"
\t\t"PersonaName"\t\t"Bob"
\t\t"Timestamp"\t\t"1800000000"
\t}
}
`;

const never = () => -1;

test("parses loginusers.vdf into account ids with either key casing", () => {
  const users = parseLoginUsers(loginUsers(""));
  assert.deepEqual([...users.keys()], ["8512976", "340403205"]);
  assert.equal(users.get("8512976")?.accountName, "alice");
  assert.equal(users.get("340403205")?.personaName, "Bob");
  assert.equal(users.get("340403205")?.timestamp, 1800000000);
  assert.equal(users.get("8512976")?.mostRecent, false);
});

test("a single folder is the user even without loginusers.vdf", () => {
  assert.deepEqual(rankSteamUsers(["8512976"], new Map(), never), [
    { id: "8512976", accountName: null, personaName: null },
  ]);
});

test("latest sign-in timestamp is the default on current clients", () => {
  const users = rankSteamUsers(
    ["8512976", "340403205"],
    parseLoginUsers(loginUsers("")),
    never
  );
  assert.deepEqual(
    users.map((u) => u.id),
    ["340403205", "8512976"]
  );
  assert.equal(users[0].personaName, "Bob");
});

test("MostRecent wins over the timestamp on older clients", () => {
  const users = rankSteamUsers(
    ["8512976", "340403205"],
    parseLoginUsers(loginUsers('\n\t\t"MostRecent"\t\t"1"')),
    never
  );
  assert.equal(users[0].id, "8512976");
});

test("folders missing from loginusers.vdf sort last, unnamed", () => {
  const users = rankSteamUsers(
    ["999", "8512976", "340403205"],
    parseLoginUsers(loginUsers("")),
    never
  );
  assert.deepEqual(users[2], {
    id: "999",
    accountName: null,
    personaName: null,
  });
});

test("without loginusers.vdf, the last touched localconfig.vdf wins", () => {
  const mtimes: { [id: string]: number } = {
    "8512976": 2000,
    "340403205": 1000,
  };
  const users = rankSteamUsers(
    ["340403205", "8512976"],
    new Map(),
    (id) => mtimes[id]
  );
  assert.equal(users[0].id, "8512976");
});
