import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// CLI-only config (generate/migrate/studio). Uses the direct (non-pooled)
// connection so schema-changing commands and advisory locks work reliably —
// the pooled DATABASE_URL is used by the running app instead, see src/lib/prisma.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
})
