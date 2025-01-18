describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should redirect to login page when not authenticated', () => {
    cy.url().should('include', '/auth/signin');
  });

  it('should login successfully with valid credentials', () => {
    cy.login('test@example.com', 'password123');
    cy.url().should('eq', Cypress.config().baseUrl + '/dashboard');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    cy.login('test@example.com', 'wrongpassword');
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid credentials');
  });

  it('should logout successfully', () => {
    cy.login('test@example.com', 'password123');
    cy.logout();
    cy.url().should('include', '/auth/signin');
  });

  it('should maintain authentication state across pages', () => {
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');
    cy.visit('/profile');
    cy.url().should('include', '/profile');
  });
}); 