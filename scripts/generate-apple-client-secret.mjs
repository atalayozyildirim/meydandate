import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
};

const args = parseArgs(process.argv.slice(2));

const teamId = args["team-id"] ?? process.env.APPLE_TEAM_ID;
const clientId = args["client-id"] ?? process.env.APPLE_CLIENT_ID;
const keyId = args["key-id"] ?? process.env.APPLE_KEY_ID;
const keyFile = args["key-file"] ?? process.env.APPLE_KEY_FILE;
const expiresInDays = Number(args["expires-in-days"] ?? process.env.APPLE_SECRET_EXPIRES_DAYS ?? 180);

if (!teamId || !clientId || !keyId || !keyFile) {
  console.error(
    [
      "Eksik arguman var.",
      "Kullanim:",
      "node scripts/generate-apple-client-secret.mjs --team-id 37525RW2KX --client-id com.ehlibyte.app.web --key-id ABC123XYZ9 --key-file ./AuthKey_ABC123XYZ9.p8",
    ].join("\n"),
  );
  process.exit(1);
}

if (!Number.isFinite(expiresInDays) || expiresInDays <= 0 || expiresInDays > 180) {
  console.error("--expires-in-days 1 ile 180 arasinda olmali.");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const exp = now + expiresInDays * 24 * 60 * 60;

const base64UrlEncode = (value) =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const privateKeyPem = readFileSync(keyFile, "utf8");
const privateKey = createPrivateKey(privateKeyPem);

const header = {
  alg: "ES256",
  kid: keyId,
};

const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const signingInput = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
const signature = sign("sha256", Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: "ieee-p1363",
});

const jwt = `${signingInput}.${base64UrlEncode(signature)}`;

console.log(jwt);
