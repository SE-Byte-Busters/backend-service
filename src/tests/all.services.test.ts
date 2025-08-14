
const request = require('supertest');

const API_URL = 'http://localhost:3000';

describe('Authentication flow', () => {

    it('should login successfully and return a token', async () => {
        const res = await request(API_URL)
            .post('/api/v1/auth/login')
            .send({
                username: "+989337236530",
                password: "Amgh2004"
            });

        // Add this line to see exactly what the test receives
        console.log('Test received response body:', res.body);

        // Check if the status code is either 200 or 201
        expect([200, 201]).toContain(res.statusCode);

        // **THE FIX**: Use res.body.data to access the nested data object
        expect(res.body.data).toHaveProperty('token');

        // **THE FIX**: Get the token from res.body.data
        const token = res.body.data.token;

        // This assertion is good practice to make sure the token isn't empty
        expect(token).toEqual(expect.any(String));
    });


});
