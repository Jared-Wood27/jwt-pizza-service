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
    const menu = [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }];
    DB.getMenu = jest.fn().mockResolvedValue(menu); // Mock DB response
    
    const res = await request(app).get('/api/order/menu');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(menu); // Check if the response matches the mock data
  });
  
  // Test: Add Menu Item as Admin
  test('PUT /api/order/menu - should allow admin to add a menu item', async () => {
    const newItem = { title: 'Student', description: 'Just carbs', image: 'pizza9.png', price: 0.0001 };
    
    DB.addMenuItem = jest.fn().mockResolvedValue(newItem);
    DB.getMenu = jest.fn().mockResolvedValue([newItem]); // Mock the updated menu response
    
    const res = await request(app)
      .put('/api/order/menu')
      .send(newItem)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual([newItem]); // Updated menu
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
    const orders = {
      dinerId: 1,
      orders: [{ id: 1, franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }] }]
    };
    DB.getOrders = jest.fn().mockResolvedValue(orders);
    
    const res = await request(app)
      .get('/api/order')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(orders);
  });
  
  // Test: Create Order Successfully
  test('POST /api/order - should create an order successfully', async () => {
    const orderRequest = {
      franchiseId: 1,
      storeId: 1,
      items: [{ menuId: 1, description: 'Veggie', price: 0.05 }]
    };
    const orderResponse = { ...orderRequest, id: 1 };
    const factoryResponse = { jwt: '1111111111', reportUrl: 'http://report.com' };
    
    DB.addDinerOrder = jest.fn().mockResolvedValue(orderResponse); // Mock the DB add order
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(factoryResponse)
    }));
    
    const res = await request(app)
      .post('/api/order')
      .send(orderRequest)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual(orderResponse);
    expect(res.body.jwt).toBe(factoryResponse.jwt);
    expect(res.body.reportUrl).toBe(factoryResponse.reportUrl);
  });

  // Test: Factory API Failure
  test('POST /api/order - should handle factory API failure', async () => {
    const orderRequest = {
      franchiseId: 1,
      storeId: 1,
      items: [{ menuId: 1, description: 'Veggie', price: 0.05 }]
    };
    const orderResponse = { ...orderRequest, id: 1 };
    
    DB.addDinerOrder = jest.fn().mockResolvedValue(orderResponse); // Mock the DB add order
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ reportUrl: 'http://errorreport.com' })
    }));
    
    const res = await request(app)
      .post('/api/order')
      .send(orderRequest)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Failed to fulfill order at factory');
    expect(res.body.reportUrl).toBe('http://errorreport.com');
  });
  
  // Test: Invalid Franchise ID in Order
  test('POST /api/order - should return 400 for missing franchiseId', async () => {
    const orderRequest = {
      storeId: 1,
      items: [{ menuId: 1, description: 'Veggie', price: 0.05 }]
    };
    
    const res = await request(app)
      .post('/api/order')
      .send(orderRequest)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(400);
  });
});