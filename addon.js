const { addonBuilder } = require("stremio-addon-sdk");
const fs = require("fs");
const path = require("path");

// --- Manifest (must include catalogs: [])
const manifest = {
  id: "community.nuvio.searchonly",
  version: "1.0.0",
  name: "Nuvio Search Streams",
  description: "Search-only addon using all Nuvio providers",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  catalogs: [] // required even if empty
};

const builder = new addonBuilder(manifest);

// --- Load all providers dynamically
const providersDir = path.join(__dirname, "providers");
const providers = fs.readdirSync(providersDir)
  .filter(file => file.endsWith(".js"))
  .map(file => {
    try {
      const provider = require(path.join(providersDir, file));
      console.log(`✅ Loaded provider: ${file}`);
      return provider;
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err);
      return null;
    }
  })
  .filter(Boolean);

// --- Stream handler
builder.defineStreamHandler(({ id }) => {
  const tasks = providers.map((fn, idx) => {
    return Promise.resolve()
      .then(() => fn(id))
      .catch(err => {
        console.error(`❌ Provider ${idx} failed:`, err);
        return { streams: [] };
      });
  });

  return Promise.allSettled(tasks).then(results => {
    const streams = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value?.streams || []);
    return { streams };
  });
});

// --- Correct export for Vercel
module.exports = builder.getInterface();
