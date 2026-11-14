// Plain-JS entry point so `node --test` discovers the suite on any runner.
// The actual assertions live in engine.test.ts (Node >= 22.6 strips types natively).
import "./engine.test.ts";
