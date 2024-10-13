const request = require('supertest'); // Imports the testing library to simulate HTTP requests
const app = require('./service'); // Imports the Express app for testing

jest.setTimeout(60 * 1000 * 5);

describe('Basic API Route Tests', () => {

    // Test for the /api/docs endpoint
    test('GET /api/docs should return API documentation', async () => {
      const res = await request(app).get('/api/docs');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('endpoints');
      expect(res.body).toHaveProperty('config');
      expect(res.body.config).toHaveProperty('factory');
      expect(res.body.config).toHaveProperty('db');
    });

  
    // Test for the / route (root)
    test('GET / should return welcome message and version', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('welcome to JWT Pizza');
      expect(res.body.version).toBeDefined(); // Check if the version is defined
    });
  
    // Test for 404 handler
    test('Unknown endpoint should return 404', async () => {
      const res = await request(app).get('/unknown-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('unknown endpoint');
    });

  });