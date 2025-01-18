# Database Documentation

## Overview
The Guilt Free Goods database is built using PostgreSQL and managed through Prisma ORM. It supports user authentication, item management, marketplace integration, and pricing analytics.

## Models

### User
Core user model that handles authentication and authorization.
- `id`: String (cuid) - Primary identifier
- `name`: String? - User's display name
- `email`: String? (unique) - User's email address
- `emailVerified`: DateTime? - When email was verified
- `password`: String? - Hashed password
- `image`: String? - Profile image URL
- `role`: UserRole (enum) - USER or ADMIN
- Relations:
  - `accounts`: One-to-many with Account
  - `sessions`: One-to-many with Session
  - `items`: One-to-many with Item
  - `listings`: One-to-many with Listing

### Account
Handles OAuth accounts linked to users (NextAuth.js).
- `id`: String (cuid) - Primary identifier
- `userId`: String - Foreign key to User
- `type`: String - Account type
- `provider`: String - OAuth provider
- `providerAccountId`: String - Provider's account ID
- Additional OAuth fields for tokens and state

### Session
Manages user sessions (NextAuth.js).
- `id`: String (cuid) - Primary identifier
- `sessionToken`: String (unique)
- `userId`: String - Foreign key to User
- `expires`: DateTime

### Item
Core model for managing resale items.
- `id`: String (cuid) - Primary identifier
- `title`: String - Item name
- `description`: String? - Item description
- `condition`: Condition (enum) - Item condition
- `brand`: String? - Brand name
- `sku`: String? (unique) - Stock keeping unit
- `status`: ItemStatus (enum) - DRAFT/ACTIVE/SOLD/ARCHIVED
- Timestamps:
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
- Relations:
  - `user`: Many-to-one with User
  - `category`: Many-to-one with Category
  - `images`: One-to-many with Image
  - `listings`: One-to-many with Listing
  - `prices`: One-to-many with Price

### Category
Hierarchical category system for items.
- `id`: String (cuid) - Primary identifier
- `name`: String (unique) - Category name
- `description`: String? - Category description
- `parentId`: String? - Self-referential for hierarchy
- Timestamps:
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
- Relations:
  - `parent`: Self-referential to Category
  - `children`: One-to-many with Category
  - `items`: One-to-many with Item

### Image
Stores item images and their metadata.
- `id`: String (cuid) - Primary identifier
- `url`: String - Image URL
- `itemId`: String - Foreign key to Item
- `isPrimary`: Boolean - Main item image flag
- `order`: Int - Display order
- `metadata`: Json? - Additional image data
- Timestamps:
  - `createdAt`: DateTime
  - `updatedAt`: DateTime

### Listing
Manages marketplace listings across platforms.
- `id`: String (cuid) - Primary identifier
- `itemId`: String - Foreign key to Item
- `userId`: String - Foreign key to User
- `platform`: Platform (enum) - EBAY/FACEBOOK/ETSY/WOOCOMMERCE
- `status`: ListingStatus (enum) - DRAFT/ACTIVE/ENDED/SOLD
- `externalId`: String? - Platform's listing ID
- `price`: Decimal - Listed price
- `currency`: String - Price currency (default: AUD)
- `quantity`: Int - Available quantity
- Timestamps:
  - `createdAt`: DateTime
  - `updatedAt`: DateTime

### Price
Tracks item pricing history and analytics.
- `id`: String (cuid) - Primary identifier
- `itemId`: String - Foreign key to Item
- `amount`: Decimal - Price amount
- `currency`: String - Price currency (default: AUD)
- `type`: PriceType (enum) - PURCHASE/LISTING/SALE/SUGGESTED/COMPETITOR
- `createdAt`: DateTime - Price timestamp

## Enums

### UserRole
- `USER`: Standard user
- `ADMIN`: Administrator

### Condition
- `NEW`: Brand new item
- `LIKE_NEW`: Used but like new
- `VERY_GOOD`: Minor wear
- `GOOD`: Normal wear
- `ACCEPTABLE`: Significant wear
- `FOR_PARTS`: Not fully functional

### ItemStatus
- `DRAFT`: Not ready for listing
- `ACTIVE`: Available for sale
- `SOLD`: Successfully sold
- `ARCHIVED`: No longer available

### Platform
- `EBAY`: eBay marketplace
- `FACEBOOK`: Facebook Marketplace
- `ETSY`: Etsy marketplace
- `WOOCOMMERCE`: WooCommerce store

### ListingStatus
- `DRAFT`: Listing in preparation
- `ACTIVE`: Currently listed
- `ENDED`: Listing ended
- `SOLD`: Item sold

### PriceType
- `PURCHASE`: Purchase cost
- `LISTING`: Listed price
- `SALE`: Sold price
- `SUGGESTED`: AI-suggested price
- `COMPETITOR`: Competitor price

## Indexes
- User: email (unique)
- Item: userId, categoryId
- Category: parentId
- Image: itemId
- Listing: itemId, userId, [platform, externalId] (unique)
- Price: itemId

## Relationships
All relationships are enforced at the database level with proper foreign key constraints and cascading deletes where appropriate (e.g., user sessions and accounts).

## Backup Strategy
TBD - Will be implemented in the next phase.

## Test Database
TBD - Will be implemented in the next phase.

## Data Validation
TBD - Will be implemented in the next phase.

## Connection Management
- Connection pooling is configured through Prisma
- Environment variables control database connection
- Proper connection handling in the application layer 