const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}


beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

test('register should fail if name is missing', async () => {
    const res = await request(app).post('/api/auth').send({ email: 'email@test.com', password: 'pass123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('name, email, and password are required');
});
  
test('register should fail if email is missing', async () => {
    const res = await request(app).post('/api/auth').send({ name: 'Test User', password: 'pass123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('name, email, and password are required');
});

test('login should fail with incorrect password', async () => {
    const res = await request(app).put('/api/auth').send({ email: testUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401); // Assuming 401 Unauthorized
    expect(res.body.message).toBe('Invalid email or password');
});
  
test('login should fail with non-existing user', async () => {
    const res = await request(app).put('/api/auth').send({ email: 'fake@test.com', password: 'pass123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
});

test('update user should fail if unauthorized', async () => {
    const updateRes = await request(app)
      .put(`/api/auth/1`) // Trying to update user 1
      .send({ email: 'newemail@test.com', password: 'newpass' })
      .set('Authorization', `Bearer ${testUserAuthToken}`); // Non-admin token
    
    expect(updateRes.status).toBe(403); // Should fail with unauthorized error
    expect(updateRes.body.message).toBe('unauthorized');
});
  
test('admin can update any user', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminToken = loginRes.body.token;
    
    const updateRes = await request(app)
      .put(`/api/auth/${testUser.id}`)
      .send({ email: 'updatedemail@test.com', password: 'newpass' })
      .set('Authorization', `Bearer ${adminToken}`);
  
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.email).toBe('updatedemail@test.com');
});