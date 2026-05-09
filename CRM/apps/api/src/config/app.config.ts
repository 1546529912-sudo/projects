export const appConfig = () => ({
  port: Number(process.env.API_PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
});
