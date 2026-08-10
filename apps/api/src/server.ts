import { buildApp } from './app.ts';
import { ConfigError, getConfig, type Config } from './platform/config.ts';

/**
 * Entry point. Configuration is validated before anything else happens, so a
 * misconfigured process dies immediately with a readable message instead of
 * binding a port and failing on the first request.
 */

let config: Config;
try {
  config = getConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    // A stack trace here would be noise: the fault is in the environment, not
    // in the code path that read it. Print the problem, nothing else.
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

const app = buildApp(config);

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
