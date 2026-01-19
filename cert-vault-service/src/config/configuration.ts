export default () => ({
    port: parseInt(process.env.PORT, 10) || 3003,
    
    database: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432, // Cambiado a 5432 para PostgreSQL
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      schema: process.env.DATABASE_SCHEMA || 'public',
      ssl: process.env.DATABASE_SSL === 'true',
    },
  
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    },
  
    firebase: {
      type: 'service_account',
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      authUri: process.env.FIREBASE_AUTH_URI,
      tokenUri: process.env.FIREBASE_TOKEN_URI,
      authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    },
  
    // Configuraciones específicas para cert-vault-service
    certificates: {
      encryption: {
        key: process.env.CERT_ENCRYPTION_KEY,
        algorithm: process.env.CERT_ENCRYPTION_ALGORITHM || 'aes-256-gcm',
        keyDerivation: {
          iterations: parseInt(process.env.PBKDF2_ITERATIONS, 10) || 100000,
          keylen: parseInt(process.env.PBKDF2_KEYLEN, 10) || 64,
          digest: process.env.PBKDF2_DIGEST || 'sha512',
        },
      },
      storage: {
        maxFileSize: parseInt(process.env.MAX_CERT_FILE_SIZE, 10) || 5242880, // 5MB
        allowedFileTypes: ['cer', 'key'],
        expirationDays: parseInt(process.env.CERT_EXPIRATION_DAYS, 10) || 180,
      },
      validation: {
        maxPasswordAttempts: parseInt(process.env.MAX_PASSWORD_ATTEMPTS, 10) || 5,
        passwordLockoutTime: parseInt(process.env.PASSWORD_LOCKOUT_TIME, 10) || 30, // minutos
      },
    },
  
    security: {
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // límite por IP
      },
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
      },
    },
  });