const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const { registerServices } = require('./src/bootstrap/services');
const container = {
  services: {},
  register(name, fn) { this.services[name] = fn; },
  resolve(name) { return this.services[name](this); }
};

registerServices(container);

async function runAuthTest() {
  const regUseCase = container.resolve('RegisterUserUseCase');
  const userRepo = container.resolve('UserRepository');
  const passwordHasher = container.resolve('PasswordHasher');
  const loginUseCase = container.resolve('LoginUserUseCase');

  const email = 'dean_debug_' + Date.now() + '@neon.edu';
  const rawPassword = 'RealBcryptPassword123!';

  console.log('--- STEP 1: REGISTER ---');
  const regRes = await regUseCase.execute({ email, password: rawPassword, name: 'Dean Debug' });
  console.log('Reg Result:', regRes.getValue());

  console.log('--- STEP 2: FIND USER IN REPO ---');
  const foundUser = await userRepo.findByEmail(email);
  console.log('Found User Object:', foundUser ? { id: foundUser.id, email: foundUser.email.value, hash: foundUser.passwordHash } : 'NULL');

  console.log('--- STEP 3: COMPARE PASSWORD ---');
  if (foundUser) {
    const isMatch = await passwordHasher.compare(rawPassword, foundUser.passwordHash);
    console.log('Bcrypt Compare Result:', isMatch);
  }

  console.log('--- STEP 4: EXECUTE LOGIN USE CASE ---');
  const loginRes = await loginUseCase.execute({ email, password: rawPassword });
  console.log('Login Res Success:', loginRes.isSuccess);
  if (loginRes.isSuccess) {
    console.log('JWT Token:', loginRes.getValue().token);
  } else {
    console.log('Login Error:', loginRes.error);
  }
}

runAuthTest();
