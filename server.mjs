import { createServer } from "node:http";
import { createReadStream, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const contentRoot = join(root, "content");
const manifestPath = join(root, "data.js");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf"
};

function toWebPath(path) {
  return path.split(sep).join("/");
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!entry.isFile()) return [];
    return [fullPath];
  });
}

function normalizeTitle(fileName) {
  return fileName
    .replace(extname(fileName), "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTopicName(name) {
  return name.replace(/_/g, " ").trim();
}

function discoverTopics() {
  if (!existsSync(contentRoot)) return [];

  const topicNames = new Set();
  for (const entry of readdirSync(contentRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nested = readdirSync(join(contentRoot, entry.name), { withFileTypes: true });
      nested
        .filter((item) => item.isDirectory())
        .forEach((item) => topicNames.add(normalizeTopicName(item.name)));

      const hasSupportedRootFiles = nested.some((item) => {
        if (!item.isFile()) return false;
        return supportedExtensions.has(extname(item.name).toLowerCase());
      });
      if (hasSupportedRootFiles) topicNames.add("Overview");
    }
  }

  return Array.from(topicNames).sort((a, b) => a.localeCompare(b));
}

function buildCatalog() {
  const files = walkFiles(contentRoot)
    .filter((filePath) => supportedExtensions.has(extname(filePath).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const seenIds = new Map();
  const assets = files.map((filePath) => {
    const appRelative = toWebPath(relative(root, filePath));
    const contentRelative = relative(contentRoot, filePath);
    const parts = contentRelative.split(/[\\/]/);
    const topicKey = parts.length >= 3 ? parts[1] : parts.length === 2 ? "Overview" : "General";
    const extension = extname(filePath).toLowerCase();
    const stats = statSync(filePath);

    const baseId = appRelative.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const count = seenIds.get(baseId) || 0;
    seenIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    return {
      id,
      title: normalizeTitle(parts.at(-1)),
      topic: topicKey.replace(/_/g, " "),
      topicKey,
      type: extension === ".pdf" ? "pdf" : "image",
      path: appRelative,
      fileName: parts.at(-1),
      size: stats.size,
      modifiedMs: Math.round(stats.mtimeMs),
      version: `${stats.size}-${Math.round(stats.mtimeMs)}`
    };
  });

  return {
    assets,
    topics: discoverTopics(),
    meta: {
      generatedAt: new Date().toLocaleString(),
      total: assets.length
    }
  };
}

function refreshManifest() {
  const catalog = buildCatalog();
  const content = `window.STUDY_ASSETS = ${JSON.stringify(catalog.assets, null, 2)};\nwindow.STUDY_TOPICS = ${JSON.stringify(catalog.topics, null, 2)};\nwindow.STUDY_MANIFEST_META = ${JSON.stringify(catalog.meta, null, 2)};\n`;
  writeFileSync(manifestPath, content, "utf8");
  return catalog;
}

let lastRefresh = 0;
let latestCatalog = refreshManifest();

function refreshManifestIfNeeded(force = false) {
  const now = Date.now();
  if (!force && now - lastRefresh < 500) return latestCatalog;
  latestCatalog = refreshManifest();
  lastRefresh = now;
  console.log(`Catalog refreshed: ${latestCatalog.assets.length} assets`);
  return latestCatalog;
}

refreshManifestIfNeeded(true);

function localIPv4Addresses() {
  return Object.values(networkInterfaces())
    .flatMap((items) => items || [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);

  if (requested === "/catalog.json") {
    const catalog = refreshManifestIfNeeded(true);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(catalog));
    return;
  }

  if (requested === "/data.js") {
    refreshManifestIfNeeded(true);
  }

  const filePath = normalize(join(root, requested));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`Ultimate Revision running at http://localhost:${port}`);
  localIPv4Addresses().forEach((address) => {
    console.log(`Phone URL on same Wi-Fi: http://${address}:${port}`);
  });
});

if (process.env.SFDC_SERVER_SELF_TEST === "1") {
  const base = `http://127.0.0.1:${port}`;
  const dataResponse = await fetch(`${base}/data.js?selfTest=${Date.now()}`);
  const data = await dataResponse.text();
  if (!dataResponse.ok || !data.includes("window.STUDY_ASSETS")) {
    throw new Error("data.js did not serve correctly");
  }

  const manifestResponse = await fetch(`${base}/manifest.webmanifest`);
  if (!manifestResponse.ok || !manifestResponse.headers.get("content-type")?.includes("manifest")) {
    throw new Error("manifest.webmanifest did not serve correctly");
  }

  const catalogResponse = await fetch(`${base}/catalog.json?selfTest=${Date.now()}`);
  const catalog = await catalogResponse.json();
  if (!catalogResponse.ok || !Array.isArray(catalog.assets) || !Array.isArray(catalog.topics) || !catalog.meta?.total) {
    throw new Error("catalog.json did not serve correctly");
  }

  const workerResponse = await fetch(`${base}/service-worker.js`);
  if (!workerResponse.ok || !workerResponse.headers.get("content-type")?.includes("javascript")) {
    throw new Error("service-worker.js did not serve correctly");
  }

  const iconResponse = await fetch(`${base}/icons/icon-192.png`);
  const icon = await iconResponse.arrayBuffer();
  if (!iconResponse.ok || icon.byteLength < 1000) {
    throw new Error("PWA icon did not serve correctly");
  }

  const imagePathMatch = data.match(/"path":\s*"([^"]+\.(?:png|jpg|jpeg|webp|gif))"/i);
  if (imagePathMatch) {
    const imageResponse = await fetch(`${base}/${imagePathMatch[1].split("/").map(encodeURIComponent).join("/")}`);
    if (!imageResponse.ok) {
      throw new Error(`Sample image did not serve correctly: HTTP ${imageResponse.status}`);
    }
    await imageResponse.arrayBuffer();
  }

  server.closeAllConnections();
  server.close(() => {
    console.log("Server self-test passed");
  });
}
