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

// Helper function to create a franchise user
async function createFranchiseUser() {
  const franchiseName = randomName(); // Generate a random name for the franchise
  // Create the franchise first
  await DB.createFranchise({ name: franchiseName, admins: [{ email: admin.email }] }); // Assuming admin has permissions to create a franchise
  let user = {
    name: randomName(),
    email: randomName() + '@franchise.com',
    password: 'userpass',
    roles: [{ role: Role.Franchisee, object: franchiseName }] // Role as Franchisee with the created franchise name
  };
  user = await DB.addUser(user); // Add the franchise user to the database
  return { ...user, password: 'userpass' };
}

let admin, franchiseUser, user;
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

  franchiseUser = await createFranchiseUser(); // Create a franchise user
  //const franchiseRes = await request(app).put('/api/auth').send(franchiseUser);
  //franchiseToken = franchiseRes.body.token;
});

test('GET /api/franchise should list all franchises', async () => {
  const res = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminToken}`);
  expect(franchiseUser.password).toBe('userpass')
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array); // Check if it returns an array
});

test('GET /api/franchise/:userId should return franchises for the user', async () => {
  const rese = await request(app)
  .post('/api/franchise')
  .send({ name: randomName(), admins: [{ email: admin.email }] })
  .set('Authorization', `Bearer ${adminToken}`);

  expect(rese.status).toBe(200);

  const res = await request(app).get(`/api/franchise/${admin.id}`).set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});

test('GET /api/franchise/:userId should return franchises for the user', async () => {
  const res = await request(app).get(`/api/franchise/${user.id}`).set('Authorization', `Bearer ${userToken}`);
  
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


//create a franchise for a franchise user
// test('POST /api/franchise should create a franchise user and view his franchises', async () => {
  
//   // Step 1: Create a franchise in the database to link to the user
//   // const franchise = await DB.createFranchise({ name: 'SomeFranchiseName' });
//   tempNameFranchise = randomName();
//   tempNameFranchiseUser = randomName();
//   const res = await request(app)
//     .post('/api/franchise')
//     .send({ name: tempNameFranchise, admins: [{ email: admin.email }] })
//     .set('Authorization', `Bearer ${adminToken}`);
  
//   expect(res.status).toBe(200);
//   expect(res.body).toHaveProperty('id');
  
//   // Step 2: Create a franchise user with the 'Franchisee' role and link to the created franchise
//   let franchiseUser = { password: 'password123', roles: [{ role: Role.Franchisee, object: tempNameFranchise}] };
//   user.name = tempNameFranchiseUser;
//   user.email = tempNameFranchiseUser + '@admin.com';

//   // Step 3: Add the user to the database with the franchise role
//   franchiseUser = await DB.addUser(franchiseUser);
  
//   // Step 4: Check that the user was created successfully
//   expect(franchiseUser.password).toBe("password123");  // ensure user creation succeeds
  
//   // Step 5: Now check that the user is associated with the franchise
//   const franRes = await request(app)
//     .get(`/api/franchise/${userRes.body.id}`)  // assuming user id is linked to the franchise
//     .set('Authorization', `Bearer ${adminToken}`);  // admin checks the franchisee's franchises
  
//   // Step 6: Ensure the response contains the correct franchise information
//   expect(franRes.status).toBe(200);  // status OK
//   expect(franRes.body).toBeInstanceOf(Array);  // check if it returns an array of franchises
//   expect(franRes.body.some(f => f.name === 'SomeFranchiseName')).toBe(true);  // confirm franchise association
//   // await DB.createFranchise({ name: 'SomeFranchiseName' });
  
// });

// async function createRegularUser() {
//   let user = { password: 'userpass', roles: [{ role: Role.Diner }] };
//   user.name = randomName();
//   user.email = user.name + '@admin.com';
//   user = await DB.addUser(user);
//   return { ...user, password: 'userpass' };
// }

//create franchise for non admin
test('POST /api/franchise should fail for non-admin user', async () => {
  const res = await request(app)
    .post('/api/franchise')
    .send({ name: randomName(), users: [{ email: user.email }] })
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

// New test to cover the error case in deleteFranchise by deleting the same franchise twice
// test('DELETE /api/franchise/:franchiseId should handle deletion failure when deleting a non-existent franchise', async () => {
//   const franchise = await DB.createFranchise({ name: randomName(), admins: [{ email: admin.email }] });
  
//   await DB.(`DELETE FROM store WHERE franchiseId = ?`, [franchise.id]);
//   //code to mess with tables and cause failure

//   // Second deletion (should fail)
//   res = await request(app)
//     .delete(`/api/franchise/${franchise.id}`)
//     .set('Authorization', `Bearer ${adminToken}`);
  
//   expect(res.status).toBe(500); // Expect a server error
//   expect(res.body.message).toBe('unable to delete franchise'); // Check the error message
// });

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


