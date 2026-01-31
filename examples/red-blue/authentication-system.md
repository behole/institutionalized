# Authentication System Design

## Overview

Design for a JWT-based authentication system for a multi-tenant SaaS application.

## Architecture

### Components

1. **Auth Service** - Issues and validates tokens
2. **User Store** - PostgreSQL database with user credentials
3. **Session Cache** - Redis for active sessions
4. **API Gateway** - Validates tokens on all requests

### Flow

1. User submits credentials (email + password)
2. Auth Service validates against User Store
3. On success: Generate JWT with user claims
4. Store session ID in Redis (7-day TTL)
5. Return JWT to client
6. Client includes JWT in Authorization header
7. API Gateway validates JWT signature + checks Redis for session
8. If valid: Forward request to service
9. If invalid: Return 401

## Security Measures

### Password Security
- bcrypt hashing (cost factor 12)
- Minimum 8 characters, require special char
- Rate limiting: 5 attempts per 15 minutes

### Token Security
- JWT signed with RS256 (asymmetric keys)
- Short expiration: 1 hour access token
- Refresh token: 7 days, stored in httpOnly cookie
- Token revocation via Redis blocklist

### API Security
- HTTPS only (TLS 1.3)
- CORS configured for known origins
- Rate limiting: 100 req/min per user
- SQL injection prevention via parameterized queries

### Multi-tenancy
- Tenant ID in JWT claims
- Row-level security in database
- Isolated Redis namespaces per tenant

## Assumptions

1. User database fits on single PostgreSQL instance
2. Redis cluster handles 10k concurrent sessions
3. JWT public key can be cached by API Gateway
4. Users access from web browsers (cookie support)
5. No need for OAuth/SSO initially
6. Trust internal network between services
7. Acceptable to lose sessions on Redis failure (users re-login)

## Constraints

- Must handle 1000 concurrent users
- 99.9% uptime requirement
- Response time <100ms for token validation
- GDPR compliant (data deletion, export)
- Budget: 2 developers, 3 months
