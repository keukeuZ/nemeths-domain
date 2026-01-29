import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://nemeths:nemeths_dev@localhost:5432/nemeths_domain',
  },
  verbose: true,
  strict: true,
});
