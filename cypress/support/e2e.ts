import '@cypress/code-coverage/support';
import './commands';

beforeEach(() => {
  cy.intercept('POST', '/api/auth/session', {
    statusCode: 200,
    body: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  }).as('session');
}); 