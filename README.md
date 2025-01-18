# Guilt Free Goods

An AI-Powered Resale Management System that helps you manage and optimize your resale business across multiple platforms.

## Features

- Multi-platform listing management
- AI-powered image processing and optimization
- Smart pricing recommendations
- Automated inventory tracking
- Integrated shipping management
- Analytics and reporting

## Prerequisites

- Node.js v18+
- PostgreSQL v14+
- Python 3.8+ (for AI services)
- Docker
- AWS Account

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/SketchClarkey/Guilt-Free-Goods.git
cd Guilt-Free-Goods
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env`
- Fill in required credentials and configuration

4. Initialize database:
```bash
npx prisma db push
```

5. Start development server:
```bash
npm run dev
```

## Project Structure

```
guilt-free-goods/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Next.js pages
│   ├── utils/         # Utility functions
│   ├── services/      # Business logic
│   └── types/         # TypeScript types
├── prisma/           # Database schema
├── public/           # Static assets
└── tests/           # Test files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code

## Contributing

1. Create a feature branch
2. Commit changes
3. Push to the branch
4. Create a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, email support@guiltfreegoods.com or join our Slack channel.

## API Endpoints

### Items API

#### GET /api/items
Retrieves all items for the authenticated user.

**Response**
```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string?",
    "condition": "NEW | LIKE_NEW | VERY_GOOD | GOOD | ACCEPTABLE | FOR_PARTS",
    "brand": "string?",
    "sku": "string?",
    "category": {
      "id": "string",
      "name": "string"
    },
    "images": [{
      "url": "string",
      "isPrimary": true
    }]
  }
]
```

#### POST /api/items
Creates a new item.

**Request Body**
```json
{
  "title": "string",
  "description": "string?",
  "condition": "NEW | LIKE_NEW | VERY_GOOD | GOOD | ACCEPTABLE | FOR_PARTS",
  "brand": "string?",
  "sku": "string?",
  "categoryId": "string"
}
```

#### GET /api/items/[id]
Retrieves a specific item by ID.

#### PUT /api/items/[id]
Updates a specific item.

**Request Body**
```json
{
  "title": "string?",
  "description": "string?",
  "condition": "NEW | LIKE_NEW | VERY_GOOD | GOOD | ACCEPTABLE | FOR_PARTS"?,
  "brand": "string?",
  "sku": "string?",
  "categoryId": "string?",
  "status": "DRAFT | ACTIVE | SOLD | ARCHIVED"?
}
```

#### DELETE /api/items/[id]
Deletes a specific item.