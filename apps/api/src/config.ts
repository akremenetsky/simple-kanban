function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env variable ${name}`);
  return value;
}

export const config = {
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  port: Number(process.env.API_PORT ?? 3000),
  host: process.env.API_HOST ?? '127.0.0.1',
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
