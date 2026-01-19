export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h',
  },

  firebase: {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  },

  salesApi: {
    url: process.env.SALES_API_URL || 'http://localhost:3001/api',
    timeout: parseInt(process.env.SALES_API_TIMEOUT, 10) || 5000,
    apiKey: process.env.SALES_API_API_KEY,
  },
});