// Unit tests use only image identity, never native image decoding.
require.extensions[".png"] = (module, filename) => {
  module.exports = filename;
};
