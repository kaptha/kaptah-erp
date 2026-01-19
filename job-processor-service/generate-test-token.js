const jwt = require('jsonwebtoken');

const payload = {
  userId: 'test-user-123',
  organizationId: 'test-org-456',
  email: 'test@test.com',
};

const secret = process.env.JWT_SECRET || 'mi_secret_super_seguro_email_service_2025_kaptah_12345';
const token = jwt.sign(payload, secret, { expiresIn: '24h' });

console.log('\n===========================================');
console.log('TOKEN JWT DE PRUEBA:');
console.log('===========================================\n');
console.log(token);
console.log('\n===========================================');
console.log('Copia este token y úsalo en Postman');
console.log('Header: Authorization');
console.log('Value: Bearer ' + token);
console.log('===========================================\n');