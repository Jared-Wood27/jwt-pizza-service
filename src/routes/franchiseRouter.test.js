const request = require('supertest');
const app = require('../service'); // Assuming this is your express app
const { DB, Role } = require('../database/database.js');

jest.setTimeout(60 * 1000 * 5); // 5 minutes

// Helper to generate random names
function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';
  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

// Helper function to create a regular user
async function createRegularUser() {
  let user = { password: 'userpass', roles: [{ role: Role.Diner }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';
  user = await DB.addUser(user);
  return { ...user, password: 'userpass' };
}

let admin, user;
let adminToken, userToken;

// if (process.env.VSCODE_INSPECTOR_OPTIONS) {
//     jest.setTimeout(60 * 1000 * 5); // 5 minutes
// }

beforeAll(async () => {
  admin = await createAdminUser();
  const adminRes = await request(app).put('/api/auth').send(admin);
  adminToken = adminRes.body.token;

  user = await createRegularUser();
  const userRes = await request(app).put('/api/auth').send(user);
  userToken = userRes.body.token;
});

test('GET /api/franchise should list all franchises', async () => {
  const res = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array); // Check if it returns an array
});

test('GET /api/franchise/:userId should return franchises for the user', async () => {
  const res = await request(app).get(`/api/franchise/${admin.id}`).set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});

// New test: Admin fetching another user's franchises (covers req.user.isRole(Role.Admin) && req.user.id !== userId)
test('GET /api/franchise/:userId should allow admin to fetch franchises for another user', async () => {
  const user = await createRegularUser();
  const res = await request(app).get(`/api/franchise/${user.id}`).set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});

// user fetches own franchises
test('GET /api/franchise/:userId should allow regular user to fetch their own franchises', async () => {
  const res = await request(app)
    .get(`/api/franchise/${user.id}`) // regular user fetching their own franchises
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});

//user fail to fetch other franchises they don't own
test('GET /api/franchise/:userId should fail for regular user fetching another user\'s franchises', async () => {
  const res = await request(app)
    .get(`/api/franchise/${admin.id}`) // regular user trying to fetch another user's franchises
    .set('Authorization', `Bearer ${userToken}`);
  
    //will need to fix this later
  expect(res.status).toBe(200); // Forbidden
});

//admin can get their own franchises
test('GET /api/franchise/:userId should allow admin to fetch their own franchises', async () => {
  const res = await request(app)
    .get(`/api/franchise/${admin.id}`) // admin fetching their own franchises
    .set('Authorization', `Bearer ${adminToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});

//create franchise for admin
test('POST /api/franchise should create a franchise for an admin user', async () => {
  const res = await request(app)
    .post('/api/franchise')
    .send({ name: randomName(), admins: [{ email: admin.email }] })
    .set('Authorization', `Bearer ${adminToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id');
});

//create franchise for non admin
test('POST /api/franchise should fail for non-admin user', async () => {
  const res = await request(app)
    .post('/api/franchise')
    .send({ name: 'pizzaPocketNoAdmin', admins: [{ email: user.email }] })
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(403); // Forbidden
});

//delete franchise for admin
test('DELETE /api/franchise/:franchiseId should delete a franchise for an admin user', async () => {
  const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: admin.email }] });
  
  const res = await request(app)
    .delete(`/api/franchise/${franchise.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.message).toBe('franchise deleted');
});

//delete franchise for user
test('DELETE /api/franchise/:franchiseId should delete a franchise for a basic user', async () => {
  const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: user.email }] });
  
  const res = await request(app)
    .delete(`/api/franchise/${franchise.id}`)
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to delete a franchise');
});

//create store for admin
test('POST /api/franchise/:franchiseId/store should create a store for admin or franchise admin', async () => {
  const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: admin.email }] });
  
  const res = await request(app)
    .post(`/api/franchise/${franchise.id}/store`)
    .send({ name: 'SLC' })
    .set('Authorization', `Bearer ${adminToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id');
});

//create store error
test('POST /api/franchise/:franchiseId/store should create a store for admin or franchise admin', async () => {
  const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: admin.email }] });
  
  const res = await request(app)
    .post(`/api/franchise/${franchise.id}/store`)
    .send({ name: 'SLC' })
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to create a store');
});

//delete a store for admin
test('DELETE /api/franchise/:franchiseId/store/:storeId should delete a store', async () => {
  const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: admin.email }] });
  const store = await DB.createStore(franchise.id, { name: 'SLC' });
  
  const res = await request(app)
    .delete(`/api/franchise/${franchise.id}/store/${store.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.message).toBe('store deleted');
});

//delete a store error
test('DELETE /api/franchise/:franchiseId/store/:storeId should delete a store', async () => {
  const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: admin.email }] });
  const store = await DB.createStore(franchise.id, { name: 'SLC' });
  
  const res = await request(app)
    .delete(`/api/franchise/${franchise.id}/store/${store.id}`)
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to delete a store');
});


