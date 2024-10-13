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





// const request = require('supertest');
// const app = require('../service'); // Import the app
// const { DB, Role } = require('../database/database.js');

// // Helper to generate random names
// function randomName() {
//   return Math.random().toString(36).substring(2, 12);
// }

// async function createAdminUser() {
//   let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
//   user.name = randomName();
//   user.email = user.name + '@admin.com';

//   user = await DB.addUser(user);
//   return { ...user, password: 'toomanysecrets' };
// }

// let adminToken, franchiseeToken, nonAdminToken;

// beforeAll(async () => {
//   // Create and log in an admin user
//   const admin = await DB.addUser({
//     name: 'Admin User',
//     email: `${randomName()}@admin.com`,
//     password: 'adminpass',
//     roles: [{ role: Role.Admin }]
//   });
//   const loginAdmin = await request(app).put('/api/auth').send({ email: admin.email, password: 'adminpass' });
//   adminToken = loginAdmin.body.token;

//   // Create and log in a franchisee user
//   const franchisee = await DB.addUser({
//     name: 'Franchisee User',
//     email: `${randomName()}@franchisee.com`,
//     password: 'franchisepass',
//     roles: [{ role: Role.Franchisee }]
//   });
//   const loginFranchisee = await request(app).put('/api/auth').send({ email: franchisee.email, password: 'franchisepass' });
//   franchiseeToken = loginFranchisee.body.token;

//   // Create and log in a non-admin user
//   const nonAdmin = await DB.addUser({
//     name: 'Non-Admin User',
//     email: `${randomName()}@user.com`,
//     password: 'userpass',
//     roles: [{ role: Role.Diner }]
//   });
//   const loginNonAdmin = await request(app).put('/api/auth').send({ email: nonAdmin.email, password: 'userpass' });
//   nonAdminToken = loginNonAdmin.body.token;
// });

// test('should list all franchises', async () => {
//     const res = await request(app).get('/api/franchise');
//     expect(res.status).toBe(200);
//     expect(res.body).toBeInstanceOf(Array); // Ensure response is an array
// });

// test('should get franchises for a specific user', async () => {
//     const userId = 4; // Set this based on your DB seed data
//     const res = await request(app)
//       .get(`/api/franchise/${userId}`)
//       .set('Authorization', `Bearer ${franchiseeToken}`);
    
//     expect(res.status).toBe(200);
//     expect(res.body).toBeInstanceOf(Array); // Ensure response is an array
// });

// test('admin should create a new franchise', async () => {
//     const franchiseData = { name: 'pizzaPocket', admins: [{ email: 'f@jwt.com' }] };
  
//     const res = await request(app)
//       .post('/api/franchise')
//       .send(franchiseData)
//       .set('Authorization', `Bearer ${adminToken}`);
  
//     expect(res.status).toBe(200);
//     expect(res.body.name).toBe('pizzaPocket');
// });
  
// test('non-admin should not create a new franchise', async () => {
//     const franchiseData = { name: 'nonAdminFranchise', admins: [{ email: 'f@jwt.com' }] };
  
//     const res = await request(app)
//       .post('/api/franchise')
//       .send(franchiseData)
//       .set('Authorization', `Bearer ${nonAdminToken}`);
  
//     expect(res.status).toBe(403);
//     expect(res.body.message).toBe('unable to create a franchise');
// });

// test('admin should delete a franchise', async () => {
//     const franchiseId = 1; // Set this based on your DB seed data
//     const res = await request(app)
//       .delete(`/api/franchise/${franchiseId}`)
//       .set('Authorization', `Bearer ${adminToken}`);
  
//     expect(res.status).toBe(200);
//     expect(res.body.message).toBe('franchise deleted');
// });
  
// test('admin should create a store for a franchise', async () => {
//     const franchiseId = 1;
//     const storeData = { name: 'SLC', franchiseId };
  
//     const res = await request(app)
//       .post(`/api/franchise/${franchiseId}/store`)
//       .send(storeData)
//       .set('Authorization', `Bearer ${adminToken}`);
  
//     expect(res.status).toBe(200);
//     expect(res.body.name).toBe('SLC');
// });
  
// test('non-admin should not create a store for a franchise', async () => {
//     const franchiseId = 1;
//     const storeData = { name: 'Fake Store', franchiseId };
  
//     const res = await request(app)
//       .post(`/api/franchise/${franchiseId}/store`)
//       .send(storeData)
//       .set('Authorization', `Bearer ${nonAdminToken}`);
  
//     expect(res.status).toBe(403);
//     expect(res.body.message).toBe('unable to create a store');
// });

// test('admin should delete a store', async () => {
//     const franchiseId = 1;
//     const storeId = 1;
  
//     const res = await request(app)
//       .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
//       .set('Authorization', `Bearer ${adminToken}`);
  
//     expect(res.status).toBe(200);
//     expect(res.body.message).toBe('store deleted');
// });
  
// test('non-admin should not delete a store', async () => {
//     const franchiseId = 1;
//     const storeId = 1;
  
//     const res = await request(app)
//       .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
//       .set('Authorization', `Bearer ${nonAdminToken}`);
  
//     expect(res.status).toBe(403);
//     expect(res.body.message).toBe('unable to delete a store');
// });

// test('should return 404 for invalid franchise ID', async () => {
//     const invalidFranchiseId = 9999;
//     const res = await request(app).get(`/api/franchise/${invalidFranchiseId}`).set('Authorization', `Bearer ${adminToken}`);
//     expect(res.status).toBe(404);
// });
  
// test('should return 400 if franchise name is missing', async () => {
//     const res = await request(app)
//       .post('/api/franchise')
//       .send({}) // Empty body
//       .set('Authorization', `Bearer ${adminToken}`);
  
//     expect(res.status).toBe(400);
// });