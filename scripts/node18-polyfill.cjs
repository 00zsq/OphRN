const os = require('node:os');
const util = require('node:util');

if (!os.availableParallelism) {
  os.availableParallelism = () => os.cpus().length || 1;
}

if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value() {
      return [...this].reverse();
    },
    configurable: true,
    writable: true,
  });
}

if (!util.styleText) {
  util.styleText = (_format, text) => text;
}
