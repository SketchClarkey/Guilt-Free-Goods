# API Documentation

## Authentication Endpoints

### POST /api/auth/signin
Sign in with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string"
  },
  "token": "string"
}
```

### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string"
  }
}
```

### POST /api/auth/signout
Sign out the current user.

**Response:**
```json
{
  "success": true
}
```

## Protected Routes

All protected routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### GET /api/user/profile
Get the current user's profile.

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### PUT /api/user/profile
Update the current user's profile.

**Request Body:**
```json
{
  "name": "string",
  "email": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "string",
  "updatedAt": "string"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "string",
  "message": "string"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "string"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "string"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "string"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "string"
} 