const axios = require('axios');
const cheerio = require('cheerio');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');
const request = require('supertest');
const app = require('../app');

describe('Integration Tests', () => {
  beforeAll(() => {
    // Mock external HTTP requests but allow localhost
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    // Setup mock for example.com
    const mockScope = nock('https://example.com')
      .get('/')
      .reply(200, sampleHtmlWithYale);
    
    // Make a request to our app using supertest
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' })
      .expect(200);
    
    // Verify the mock was called
    expect(mockScope.isDone()).toBe(true);
    
    expect(response.body.success).toBe(true);
    
    // Verify Yale has been replaced with Fale in text
    const content = response.body.content;
    expect(content).toContain('Fale University Test Page');
    expect(content).toContain('Welcome to Fale University');
    expect(content).toContain('Fale University is a private');
    
    // Verify URLs remain unchanged
    expect(content).toContain('https://www.yale.edu/about');
    
    // Verify link text is changed
    expect(content).toContain('>About Fale<');
  });

  test('Should handle invalid URLs', async () => {
    // Make a request with an invalid URL
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'not-a-valid-url' })
      .expect(500);
    
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('Should handle missing URL parameter', async () => {
    // Make a request without a URL
    const response = await request(app)
      .post('/fetch')
      .send({})
      .expect(400);
    
    expect(response.body.error).toBe('URL is required');
  });
});
