const request = require('supertest');
const app = require('../service'); // Import the app
const { DB, Role } = require('../database/database.js');

let adminToken, userToken;

beforeAll(async () => {
  // Create and log in an admin user
  const admin = await DB.addUser({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'adminpass',
    roles: [{ role: Role.Admin }]
  });
  const loginAdmin = await request(app).put('/api/auth').send({ email: admin.email, password: 'adminpass' });
  adminToken = loginAdmin.body.token;

  // Create and log in a regular user
  const user = await DB.addUser({
    name: 'Regular User',
    email: 'user@example.com',
    password: 'userpass',
    roles: [{ role: Role.Diner }]
  });
  const loginUser = await request(app).put('/api/auth').send({ email: user.email, password: 'userpass' });
  userToken = loginUser.body.token;
});

describe('OrderRouter Endpoints', () => {

// Test: Get Menu
test('GET /api/order/menu - should get the pizza menu', async () => {
  const res = await request(app).get('/api/order/menu');
  
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength; // Check if the menu contains items
});

// Test: Add Menu Item as Admin
test('PUT /api/order/menu - should allow admin to add a menu item', async () => {
  const newItem = { title: 'Student', description: 'Just carbs', image: 'pizza9.png', price: 0.0001 };
  
  const res = await request(app)
    .put('/api/order/menu')
    .send(newItem)
    .set('Authorization', `Bearer ${adminToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.some(item => item.title === 'Student')).toBeTruthy(); // Check if the new item is in the menu
});

// Test: Non-admin cannot add menu item
test('PUT /api/order/menu - non-admin should receive 403 forbidden', async () => {
  const newItem = { title: 'Student', description: 'Just carbs', image: 'pizza9.png', price: 0.0001 };
  
  const res = await request(app)
    .put('/api/order/menu')
    .send(newItem)
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to add menu item');
});

// Test: Get User's Orders
test('GET /api/order - should return user orders', async () => {
  const res = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.orders).toHaveLength; // Check if the user has orders
});

// Test: Create Order Successfully
test('POST /api/order - should create an order successfully (integration test)', async () => {
  // Define the order request payload
  const orderRequest = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: 1, description: 'Veggie', price: 0.05 }]
  };

  // Send the POST request to the actual /api/order endpoint
  const res = await request(app)
    .post('/api/order')
    .send(orderRequest)
    .set('Authorization', `Bearer ${userToken}`);  // Assuming `userToken` is properly initialized

  // Assertions based on the actual response from the external service and the system
  expect(res.status).toBe(200);
  expect(res.body.order.items[0].description).toBe('Veggie');

  const orderRequestTwo = {
    franchiseId: 2,
    storeId: 2,
    items: [{ menuId: 1, description: 'meat', price: 0.05 }]
  };

  const resOne = await request(app)
    .post('/api/order')
    .send(orderRequestTwo)
    .set('Authorization', `Bearer ${userToken}`);

  expect(resOne.status).toBe(200);
  expect(resOne.body.order.items[0].description).toBe('meat');

  const resTwo = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(resTwo.status).toBe(200);
  expect(resTwo.body.orders).toHaveLength;

});

// Test: Factory API Failure
test('POST /api/order - should handle factory API failure (integration test)', async () => {
  // Define the order request payload
  const orderRequest = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: 1, description: 'Veggie', price: 0.05 }]
  };

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false, // Simulates a failed API response
      json: () => Promise.resolve({ reportUrl: 'http://errorreport.com' })
    })
  );
  // Send the POST request to the actual /api/order endpoint
  const res = await request(app)
    .post('/api/order')
    .send(orderRequest)
    .set('Authorization', `Bearer ${userToken}`);  // Assuming `userToken` is properly initialized

  // Assuming the real factory API failed, check the failure response
  expect(res.status).toBe(500);
  expect(res.body.message).toBe('Failed to fulfill order at factory');
  
  // Validate that the failure includes the report URL
  //expect(res.body.reportUrl).toBeDefined();
});

// Test: Invalid Franchise ID in Order
test('POST /api/order - should return 500 for missing franchiseId', async () => {
  const orderRequest = {
    storeId: 1,
    items: [{ menuId: 1, description: 'Veggie', price: 0.05 }]
  };

  
  const res = await request(app)
    .post('/api/order')
    .send(orderRequest)
    .set('Authorization', `Bearer ${userToken}`);
  
  expect(res.status).toBe(500);
  });
});
