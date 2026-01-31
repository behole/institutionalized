# REST API Specification: User Management Service

## Overview

This document specifies the REST API for the User Management Service, a microservice responsible for user CRUD operations, authentication, and authorization.

## Base URL

```
Production: https://api.example.com/v1
Staging: https://staging-api.example.com/v1
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <token>
```

## Endpoints

### Create User

**POST** `/users`

Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "John Doe",
  "role": "user"
}
```

**Response:** `201 Created`
```json
{
  "id": "usr_1234567890",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2026-01-30T12:00:00Z"
}
```

**Errors:**
- `400` - Invalid request (missing required fields, invalid email format)
- `409` - Email already exists

### Get User

**GET** `/users/{id}`

Retrieves user details by ID.

**Response:** `200 OK`
```json
{
  "id": "usr_1234567890",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2026-01-30T12:00:00Z",
  "lastLogin": "2026-01-30T14:30:00Z"
}
```

**Errors:**
- `404` - User not found
- `403` - Insufficient permissions

### Update User

**PATCH** `/users/{id}`

Updates user information.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "role": "admin"
}
```

**Response:** `200 OK` (returns updated user object)

**Errors:**
- `404` - User not found
- `403` - Insufficient permissions
- `400` - Invalid update data

### Delete User

**DELETE** `/users/{id}`

Soft-deletes a user account.

**Response:** `204 No Content`

**Errors:**
- `404` - User not found
- `403` - Insufficient permissions

### List Users

**GET** `/users`

Lists all users with pagination.

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `role` (string, optional filter)

**Response:** `200 OK`
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Rate Limiting

- 1000 requests per hour per API key
- Rate limit headers included in all responses

## Versioning

API version specified in URL. Breaking changes require new major version.
