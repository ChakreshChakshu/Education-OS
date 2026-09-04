const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const http = require('http');

function makeRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testSecurity() {
  const testEmail = 'sec_' + Date.now() + '@neon.edu';
  const testPassword = 'SecurePassword123!';

  console.log('--- 1. Registering New User ---');
  const reg = await makeRequest('/api/v1/public/auth/register', 'POST', {}, {
    email: testEmail,
    password: testPassword,
    name: 'Security Admin'
  });
  console.log('POST /api/v1/public/auth/register Status:', reg.status, reg.body);

  console.log('\n--- 2. Logging in to get Real JWT Token ---');
  const login = await makeRequest('/api/v1/public/auth/login', 'POST', {}, {
    email: testEmail,
    password: testPassword
  });
  console.log('POST /api/v1/public/auth/login Status:', login.status);
  const jwtToken = login.body.token;
  console.log('Received Signed JWT Token:', jwtToken ? jwtToken.substring(0, 45) + '...' : 'NONE');

  console.log('\n--- 3. Testing Internal Protected Route WITH Invalid Token ---');
  const badToken = await makeRequest('/api/v1/internal/me', 'GET', { Authorization: 'Bearer fake.invalid.token' });
  console.log('GET /api/v1/internal/me (Bad Token) Status:', badToken.status, badToken.body);

  console.log('\n--- 4. Testing Internal Protected Route WITH Valid JWT Token ---');
  const validReq = await makeRequest('/api/v1/internal/me', 'GET', { Authorization: `Bearer ${jwtToken}` });
  console.log('GET /api/v1/internal/me (Valid Signed JWT) Status:', validReq.status, validReq.body);
}

testSecurity();
