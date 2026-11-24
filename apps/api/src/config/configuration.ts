import { validateEnv } from './env.validation';

export default () => {
  const env = validateEnv(process.env);
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      apiPrefix: env.API_PREFIX,
      corsOrigin: env.CORS_ORIGIN.includes(',') ? env.CORS_ORIGIN.split(',') : env.CORS_ORIGIN,
      logLevel: env.LOG_LEVEL,
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    storage: {
      driver: env.STORAGE_DRIVER,
      localPath: env.STORAGE_LOCAL_PATH,
      maxFileSizeBytes: env.MAX_FILE_SIZE_BYTES,
    },
    ai: {
      provider: env.AI_PROVIDER,
      apiKey: env.AI_API_KEY,
    },
    stellar: {
      network: env.STELLAR_NETWORK,
      horizonUrl: env.STELLAR_HORIZON_URL,
      rpcUrl: env.STELLAR_RPC_URL,
      contractId: env.STELLAR_ROYALTY_CONTRACT_ID,
      platformPublicKey: env.STELLAR_PLATFORM_PUBLIC_KEY,
    },
  };
};
