const { addonBuilder } = require("stremio-addon-sdk");
const fs = require("fs");
const path = require("path");

const manifest = {
  id: "community.nuvio.searchonly",
  version: "1.0.0",
  name: "Nuvio Search Streams",
  description: "Search-only addon using all Nuvio providers",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

const builder = new addonBuilder(manifest);

// Dynamically load all .js providers from the /providers folder
const providersDir = path.join(__dirname, "providers");
const providers = fs.readdirSync(providersDir)
  .filter(file => file.endsWith(".js"))
  .map(file => {
    try {
      return require(path.join(providersDir, file));
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
      return null;
    }
  })
  .filter(Boolean); // Remove failed imports

builder.defineStreamHandler(({ id }) => {
  const tasks = providers.map(fn => {
    try {
      return fn(id);
    } catch (e) {
      return Promise.resolve({ streams: [] });
    }
  });

  return Promise.allSettled(tasks).then(results => {
    const streams = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value?.streams || []);
    return { streams };
  });
});

module.exports = builder.getInterface();
