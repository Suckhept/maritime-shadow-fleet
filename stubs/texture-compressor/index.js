// Security stub — see package.json. Throws only if the (unused) encode path is ever reached.
const unavailable = () => { throw new Error("texture-compressor stubbed out for security (unpatched image-size)"); };
module.exports = new Proxy({}, { get: () => unavailable });
