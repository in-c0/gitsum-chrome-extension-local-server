# GITSUM Backend API

Backend API for the GITSUM Chrome extension, providing authentication, subscription management, repository processing, and LLM integration.

## Environment Setup

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/your-username/gitsum-api.git
   cd gitsum-api
   \`\`\`

2. Copy the example environment file and update the variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Update the `.env` file with your actual values:
   - Generate a JWT secret: `openssl rand -base64 32`
   - Set up MongoDB connection string
   - Add Stripe API keys
   - Add OpenAI API key
   - Add GitHub token (optional)

## Development

### Option 1: Local Development

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Seed the database with sample data (optional):
   \`\`\`bash
   npm run seed
   \`\`\`

### Option 2: Docker Development

1. Make sure Docker and Docker Compose are installed on your machine.

2. Start the development environment:
   \`\`\`bash
   npm run docker:dev
   \`\`\`

3. To stop the containers:
   \`\`\`bash
   npm run docker:down
   \`\`\`

## Production Deployment

1. Build the Docker image:
   \`\`\`bash
   npm run docker:build
   \`\`\`

2. Deploy to your preferred hosting platform (AWS, GCP, Azure, etc.)

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Subscription Endpoints

- `GET /api/subscription` - Get user subscription
- `POST /api/subscription/create` - Create subscription
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/webhook` - Handle Stripe webhook events
- `PUT /api/subscription/payment-method` - Update payment method

### Repository Endpoints

- `POST /api/repository/process` - Process a GitHub repository
- `GET /api/repository/:owner/:name` - Get repository data
- `GET /api/repository/status/:owner/:name` - Get processing status

### Chat Endpoints

- `POST /api/chat/send` - Send message to LLM
- `GET /api/chat/history/:repositoryUrl` - Get chat history
- `DELETE /api/chat/history/:repositoryUrl` - Clear chat history

## Testing

Run tests:
\`\`\`bash
npm test
\`\`\`

## License

[MIT](LICENSE)
\`\`\`

Let's create a simple health check script:
