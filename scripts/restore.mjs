import fs from "node:fs";
import path from "node:path";
import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

async function main() {
  const dir = "backups";
  const requested = process.argv[2];
  let file = requested;
  if (!file) {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("memory-") && f.endsWith(".json"))
      .sort();
    if (files.length === 0) throw new Error("No backups found in ./backups");
    file = path.join(dir, files[files.length - 1]);
  }
  if (!fs.existsSync(file)) throw new Error(`Backup not found: ${file}`);

  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  const client = new Redis(url);
  const pipe = client.pipeline();
  for (const [key, entry] of Object.entries(snapshot)) {
    pipe.restore(key, entry.ttl, Buffer.from(entry.data, "base64"), { replace: true });
  }
  await pipe.exec();
  await client.quit();
  console.log(`Restored ${Object.keys(snapshot).length} keys from ${file}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
