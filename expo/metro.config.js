// Metro config for the hybrid app. `wasm` assets are required by
// expo-sqlite's web build (it compiles SQLite to WebAssembly).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm", "db");

module.exports = config;
