const { addonBuilder } = require("stremio-addon-sdk");
const fs = require("fs");
const path = require("path");

// --- Manifest
const manifest = {
  id: "community.nuvio.searchonly",
  version: "1.0.0",
  name: "Nuvio Search Streams",
  description: "Search-only addon using all Nuvio providers",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  catalogs: []
};

const builder = new addonBuilder(manifest);

// --- Load all providers dynamically
const providersDir = path.join(__dirname, "providers");
let providers = [];

if (fs.existsSync(providersDir)) {
  providers = fs
    .readdirSync(providersDir)
    .filter(file => file.endsWith(".js"))
    .map(file => {
      try {
        return require(path.join(providersDir, file));
      } catch (err) {
        console.error(`Failed to load provider ${file}:`, err);
        return null;
      }
    })
    .filter(Boolean);
}

// --- Stream handler
builder.defineStreamHandler(({ id }) => {
  const tasks = providers.map(provider =>
    Promise.resolve()
      .then(() => provider(id))
      .catch(() => ({ streams: [] }))
  );

  return Promise.all(tasks).then(results => ({
    streams: results.flatMap(r => r.streams || [])
  }));
});

// --- Vercel handler with favicon handling
const addonInterface = builder.getInterface();

module.exports = (req, res) => {
  // Handle favicon requests gracefully
  if (req.url === "/favicon.ico") {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Pass all other requests to Stremio addon interface
  addonInterface(req, res);
};
