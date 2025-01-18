# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability within Guilt Free Goods, please follow these steps:

1. **Do NOT report security vulnerabilities through public GitHub issues.**

2. Send an email to security@guiltfreegoods.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (if available)

3. You should receive a response within 48 hours.

4. We will:
   - Confirm receipt of your report
   - Assess the impact and validity
   - Work on a fix if required
   - Keep you informed of our progress

## Security Measures

### Authentication
- JWT-based authentication
- Role-based access control
- Session management with automatic timeout
- Rate limiting on authentication endpoints

### Data Protection
- All sensitive data is encrypted at rest
- HTTPS enforced for all communications
- Input validation on all endpoints
- Prepared statements for database queries

### Infrastructure
- Regular security updates
- Automated vulnerability scanning
- Continuous monitoring
- Regular backups with encryption

## Development Practices

1. **Code Review**
   - All code changes undergo security review
   - Automated security scanning in CI/CD
   - Regular dependency updates

2. **Testing**
   - Security test cases required
   - Penetration testing performed regularly
   - Automated security testing in pipeline

3. **Dependencies**
   - Regular dependency audits
   - Automated vulnerability scanning
   - Version pinning for stability

## Compliance

We aim to comply with:
- OWASP Security Guidelines
- GDPR requirements
- Industry standard security practices 