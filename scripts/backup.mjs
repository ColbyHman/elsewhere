import fs from "node:fs";
import path from "node:path";
import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";
const dir = process.env.BACKUP_DIR ?? "backups";
const keep = Number(process.env.BACKUP_KEEP ?? 14);

async function main() {
  const client = new Redis(url);
  const keys = [];
  for await (const batch of client.scanStream({ match: "memory:*", count: 500 })) {
    keys.push(...batch);
  }

  const pipe = client.pipeline();
  for (const key of keys) {
    pipe.dump(key);
    pipe.ttl(key);
  }
  const results = await pipe.exec();

  const snapshot = {};
  for (let i = 0; i < keys.length; i++) {
    const dump = results[i * 2]?.[1];
    const ttl = results[i * 2 + 1]?.[1];
    if (dump) snapshot[keys[i]] = { data: Buffer.from(dump).toString("base64"), ttl: Number(ttl) };
  }
  await client.quit();

  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const file = path.join(dir, `memory-${stamp}.json`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snapshot));

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("memory-") && f.endsWith(".json"))
    .sort();
  const removed = Math.max(0, files.length - keep);
  for (const old of files.slice(0, removed)) fs.unlinkSync(path.join(dir, old));

  console.log(`Backup written: ${file} (${Object.keys(snapshot).length} keys, pruned ${removed})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
