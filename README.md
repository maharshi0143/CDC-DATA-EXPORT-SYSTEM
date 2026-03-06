# CDC Data Export System

[![Test Coverage](https://img.shields.io/badge/coverage-95.06%25-brightgreen.svg)](https://github.com/yourusername/cdc-data-export)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

A production-ready, containerized Change Data Capture (CDC) data export system built with Node.js, Express, and PostgreSQL. This system efficiently synchronizes large datasets using watermarking for stateful processing, supporting full, incremental, and delta export strategies.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## ✨ Features

- **Multiple Export Strategies**
  - **Full Export**: Complete dataset dumps for initial synchronization
  - **Incremental Export**: Only new/updated records since last export
  - **Delta Export**: Records with operation type (INSERT, UPDATE, DELETE)

- **Advanced CDC Capabilities**
  - Watermark-based tracking for consistent state management
  - Per-consumer watermarking for multi-consumer support
  - Transactional watermark updates to prevent data loss
  - Soft delete support for tracking deletions

- **Production-Ready Features**
  - Fully containerized with Docker and Docker Compose
  - Asynchronous job processing (non-blocking API)
  - Structured JSON logging for observability
  - Comprehensive error handling and rollback mechanisms
  - 95%+ test coverage with unit and integration tests
  - Health check endpoints for monitoring

- **Performance Optimizations**
  - Database indexing on `updated_at` column
  - Connection pooling for concurrent requests
  - Efficient CSV streaming for large datasets
  - Automatic directory creation for exports

## 🏗️ Architecture

![CDC Data Export System Architecture](docs/architecture.png)

**System Design Overview:**

This diagram illustrates the complete flow of the CDC Data Export System:

- **API Client** sends requests with X-Consumer-ID header
- **REST API Layer** exposes five endpoints for health checks and exports
- **Controller Layer** validates requests and returns async job confirmations (202 Accepted)
- **Service Layer** orchestrates business logic and dispatches asynchronous jobs
- **Export Jobs Worker** processes exports in the background, queries the database, and generates CSV files
- **PostgreSQL Database** maintains users and watermarks tables with proper indexing
- **File Storage** (/output/) hosts generated CSV files accessible to data consumers
- **Watermark Management** ensures stateful, idempotent exports with per-consumer tracking

### Component Breakdown

- **API Layer** (`src/controllers/`, `src/routes/`): Request validation and response handling
- **Service Layer** (`src/services/`): Business logic orchestration and asynchronous dispatch
- **Job Workers** (`src/jobs/`): Background export processing with transaction management
- **Database Layer** (`src/db/`): Watermark queries and connection pooling
- **Utilities** (`src/utils/`): CSV writing, logging, and helper functions

## 📦 Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) - for local development (optional)
- **npm** (v8+) - for dependency management (optional)
- **Git** - for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cdc-data-export.git
cd cdc-data-export
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env file with your configuration if needed
```

### 3. Start the Application

```bash
docker-compose up --build
```

This command will:
- Build the application Docker image
- Start PostgreSQL with health checks
- Wait for database to be ready
- Run database migrations and seeding (100,000+ users)
- Start the API server on port 8080

### 4. Verify the Setup

```bash
# Check health endpoint
curl http://localhost:8080/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-03-05T10:30:00.000Z"
# }
```

### 5. Trigger Your First Export

```bash
# Full export
curl -X POST http://localhost:8080/exports/full \
  -H "X-Consumer-ID: consumer-1"

# Expected response:
# {
#   "jobId": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "started",
#   "exportType": "full",
#   "outputFilename": "full_consumer-1_1709635800000.csv"
# }
```

### 6. Access Export Files

Export files are available in the `./output` directory:

```bash
ls -lh output/
# full_consumer-1_1709635800000.csv
```

## 📡 API Documentation

### Base URL

```
http://localhost:8080
```

### Endpoints

#### 1. Health Check

**GET** `/health`

Check if the service is running.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T10:30:00.000Z"
}
```

---

#### 2. Full Export

**POST** `/exports/full`

Exports all non-deleted users and establishes a watermark.

**Headers:**
```
X-Consumer-ID: string (required) - Unique identifier for the consumer
```

**Response** (202 Accepted):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "started",
  "exportType": "full",
  "outputFilename": "full_consumer-1_1709635800000.csv"
}
```

**Output CSV Format:**
```csv
id,name,email,created_at,updated_at,is_deleted
1,User 1,user1@example.com,2026-02-03T10:30:00.000Z,2026-02-03T10:30:00.000Z,false
2,User 2,user2@example.com,2026-02-04T14:20:00.000Z,2026-02-04T14:20:00.000Z,false
```

---

#### 3. Incremental Export

**POST** `/exports/incremental`

Exports only records updated since the last export for this consumer.

**Headers:**
```
X-Consumer-ID: string (required)
```

**Response** (202 Accepted):
```json
{
  "jobId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "started",
  "exportType": "incremental",
  "outputFilename": "incremental_consumer-1_1709635900000.csv"
}
```

**Behavior:**
- First export: Returns all records (no watermark exists)
- Subsequent exports: Returns only records where `updated_at > last_exported_at`
- Excludes soft-deleted records (`is_deleted = FALSE`)
- Updates watermark on successful completion

---

#### 4. Delta Export

**POST** `/exports/delta`

Exports changed records with operation type indicators (INSERT, UPDATE, DELETE).

**Headers:**
```
X-Consumer-ID: string (required)
```

**Response** (202 Accepted):
```json
{
  "jobId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "started",
  "exportType": "delta",
  "outputFilename": "delta_consumer-1_1709636000000.csv"
}
```

**Output CSV Format:**
```csv
operation,id,name,email,created_at,updated_at,is_deleted
INSERT,100,New User,newuser@example.com,2026-03-05T10:00:00.000Z,2026-03-05T10:00:00.000Z,false
UPDATE,50,Updated User,updated@example.com,2026-02-01T10:00:00.000Z,2026-03-05T11:00:00.000Z,false
DELETE,75,Deleted User,deleted@example.com,2026-02-10T10:00:00.000Z,2026-03-05T12:00:00.000Z,true
```

**Operation Logic:**
- `INSERT`: `created_at` equals `updated_at`
- `UPDATE`: `created_at` < `updated_at` and `is_deleted = FALSE`
- `DELETE`: `is_deleted = TRUE`

---

#### 5. Get Watermark

**GET** `/exports/watermark`

Retrieves the current watermark timestamp for a consumer.

**Headers:**
```
X-Consumer-ID: string (required)
```

**Response** (200 OK):
```json
{
  "consumerId": "consumer-1",
  "lastExportedAt": "2026-03-05T10:30:00.000Z"
}
```

**Response** (404 Not Found):
```json
{
  "message": "No watermark found for this consumer"
}
```

---

### Error Responses

**400 Bad Request** - Missing required headers:
```json
{
  "error": "X-Consumer-ID header is required"
}
```

**500 Internal Server Error** - Server-side errors:
```json
{
  "error": "Internal server error"
}
```

## ⚙️ Configuration

### Environment Variables

Configure the application by creating a `.env` file (use `.env.example` as template):

```bash
# Application Configuration
PORT=8080                          # API server port
LOG_LEVEL=info                     # Logging level (debug, info, warn, error)

# Database Configuration
DATABASE_URL=postgresql://user:password@db:5432/mydatabase
# Format: postgresql://[user]:[password]@[host]:[port]/[database]

# Export Configuration
EXPORT_PATH=/app/output            # Path for CSV export files
```

### Docker Compose Configuration

The `docker-compose.yml` file defines two services:

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydatabase
      - PORT=8080
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./output:/app/output
    restart: always

  db:
    image: postgres:13
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydatabase
    volumes:
      - ./seeds:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydatabase"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Database Schema

#### `users` Table

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_users_updated_at ON users(updated_at);
```

#### `watermarks` Table

```sql
CREATE TABLE watermarks (
    id SERIAL PRIMARY KEY,
    consumer_id VARCHAR(255) UNIQUE NOT NULL,
    last_exported_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

## 🛠️ Development

### Local Development Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Start Database Only** (for local development)
```bash
docker-compose up db
```

3. **Run Application Locally**
```bash
npm run dev
# Runs with nodemon for auto-reload
```

4. **Run Linter**
```bash
npm run lint
```

### Project Structure

```
cdc-data-export/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js             # Server entry point
│   ├── config/
│   │   └── db.js             # Database connection pooling
│   ├── controllers/
│   │   └── exportController.js   # API request handlers
│   ├── services/
│   │   └── exportService.js      # Business logic layer
│   ├── jobs/
│   │   └── exportJob.js          # Background export workers
│   ├── db/
│   │   └── watermarkQueries.js   # Watermark CRUD operations
│   ├── routes/
│   │   └── exportRoutes.js       # API route definitions
│   └── utils/
│       ├── csvWriter.js          # CSV file generation
│       └── logger.js             # Logging utility
├── tests/
│   ├── export.test.js            # API integration tests
│   ├── exportJob.test.js         # Job worker unit tests
│   ├── exportService.test.js     # Service layer tests
│   ├── csvWriter.test.js         # CSV writer tests
│   ├── watermarkQueries.test.js  # Database query tests
│   ├── health.test.js            # Health endpoint tests
│   └── db.test.js                # Database config tests
├── seeds/
│   ├── init.sql                  # Schema initialization
│   └── seed_users.sql            # 100k+ user seed data
├── output/                        # Export files directory (gitignored)
├── docker-compose.yml            # Container orchestration
├── Dockerfile                    # Application container image
├── package.json                  # Node.js dependencies
├── jest.config.js                # Test configuration
├── eslint.config.mjs             # Linter configuration
├── .env.example                  # Environment variable template
├── .gitignore                    # Git ignore rules
└── README.md                     # This file
```

## 🧪 Testing

The project includes comprehensive test coverage (95.06%) with unit and integration tests.

### Run All Tests

```bash
# Inside Docker container
docker-compose exec app npm test

# Or locally
npm test
```

### Run Tests with Coverage Report

```bash
npm run coverage
```

### Coverage Report

```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   95.06 |       75 |   86.95 |   95.06 |
 src                  |     100 |      100 |     100 |     100 |
  app.js              |     100 |      100 |     100 |     100 |
 src/config           |      75 |      100 |       0 |      75 |
  db.js               |      75 |      100 |       0 |      75 |
 src/controllers      |   91.66 |       70 |     100 |   91.66 |
  exportController.js |   91.66 |       70 |     100 |   91.66 |
 src/db               |   83.33 |      100 |      50 |   83.33 |
  watermarkQueries.js |   83.33 |      100 |      50 |   83.33 |
 src/jobs             |     100 |    83.33 |     100 |     100 |
  exportJob.js        |     100 |    83.33 |     100 |     100 |
 src/routes           |     100 |      100 |     100 |     100 |
  exportRoutes.js     |     100 |      100 |     100 |     100 |
 src/services         |    92.3 |      100 |   85.71 |    92.3 |
  exportService.js    |    92.3 |      100 |   85.71 |    92.3 |
 src/utils            |   88.88 |       50 |     100 |   88.88 |
  csvWriter.js        |   86.66 |       50 |     100 |   86.66 |
  logger.js           |     100 |      100 |     100 |     100 |
----------------------|---------|----------|---------|---------|
```

### Test Categories

- **Unit Tests**: Individual function/module testing
- **Integration Tests**: API endpoint and database interaction testing
- **Mock Testing**: External dependencies mocked for isolation

## 🚢 Production Deployment

### Pre-Production Checklist

Before deploying to production, ensure you:

- [ ] Change default database credentials in `docker-compose.yml`
- [ ] Use environment-specific `.env` files (never commit `.env`)
- [ ] Enable HTTPS/TLS for API endpoints
- [ ] Implement authentication and authorization
- [ ] Set up monitoring and alerting (Prometheus, Datadog, etc.)
- [ ] Configure log aggregation (ELK stack, CloudWatch, etc.)
- [ ] Implement rate limiting on API endpoints
- [ ] Set up database backups and disaster recovery
- [ ] Configure connection pooling limits based on load
- [ ] Review and optimize database indexes
- [ ] Set up CI/CD pipelines
- [ ] Perform load testing and capacity planning

### Environment-Specific Configuration

**Production** `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}  # Use external RDS/managed DB
      - PORT=8080
      - LOG_LEVEL=warn
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
    restart: always

  # Remove db service - use managed database (AWS RDS, Cloud SQL)
```

### Security Best Practices

1. **Use Secrets Management**: AWS Secrets Manager, HashiCorp Vault
2. **Network Isolation**: VPC, security groups, firewalls
3. **Least Privilege**: IAM roles with minimal permissions
4. **Input Validation**: Sanitize all user inputs
5. **SQL Injection Prevention**: Always use parameterized queries (already implemented)
6. **Regular Updates**: Keep dependencies updated for security patches

### Scaling Considerations

**Horizontal Scaling**:
- Deploy multiple app instances behind a load balancer
- Use message queues (RabbitMQ, SQS) for job distribution
- Implement distributed locks for concurrent exports

**Vertical Scaling**:
- Increase container CPU/memory allocation
- Optimize database queries and indexes
- Implement caching (Redis) for watermark lookups

**Database Optimization**:
- Use read replicas for export queries
- Partition large tables by date ranges
- Implement connection pooling with pg-bouncer

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Refused

**Symptom**: `Error: connect ECONNREFUSED`

**Solution**:
```bash
# Check if database is healthy
docker-compose ps

# Restart services
docker-compose down
docker-compose up --build
```

#### 2. Export Files Not Generated

**Symptom**: 202 response but no CSV file in `./output`

**Solution**:
```bash
# Check application logs
docker-compose logs app

# Verify volume mount
docker-compose exec app ls -la /app/output

# Check file permissions
chmod -R 755 output/
```

#### 3. Watermark Not Updating

**Symptom**: Incremental exports returning all records

**Solution**:
```bash
# Check watermarks table
docker-compose exec db psql -U user -d mydatabase \
  -c "SELECT * FROM watermarks;"

# Verify export job completion in logs
docker-compose logs app | grep export_completed
```

#### 4. Out of Memory Errors

**Symptom**: Container crashes during large exports

**Solution**:
```yaml
# Increase container memory limit in docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### 5. Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::8080`

**Solution**:
```bash
# Change port in docker-compose.yml
ports:
  - "8081:8080"

# Or stop the conflicting process
lsof -ti:8080 | xargs kill -9
```

### Debug Mode

Enable debug logging:

```bash
# In .env file
LOG_LEVEL=debug

# Restart containers
docker-compose restart app
```

### View Real-Time Logs

```bash
# All services
docker-compose logs -f

# App service only
docker-compose logs -f app

# Database service
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100 app
```

### Database Query Debugging

Access PostgreSQL console:

```bash
docker-compose exec db psql -U user -d mydatabase
```

Useful queries:
```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- Check watermarks
SELECT * FROM watermarks;

-- Check recent updates
SELECT * FROM users WHERE updated_at > NOW() - INTERVAL '1 hour' LIMIT 10;

-- Check deleted records
SELECT COUNT(*) FROM users WHERE is_deleted = TRUE;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'users';
```

## 📈 Performance Benchmarks

Tested on: MacBook Pro M1, 16GB RAM, Docker Desktop 4.17

| Export Type | Records | Time    | File Size | Memory Usage |
|-------------|---------|---------|-----------|--------------|
| Full        | 100,000 | ~2.3s   | 15 MB     | 150 MB       |
| Incremental | 1,000   | ~0.15s  | 150 KB    | 50 MB        |
| Delta       | 5,000   | ~0.7s   | 750 KB    | 75 MB        |

*Results may vary based on hardware and configuration*

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow ESLint configuration
- Write unit tests for new features
- Maintain 70%+ test coverage
- Use conventional commit messages

## 📄 License

###.

## 👥 Authors

- **Maharshi Denuvakonda** - *Initial work* - [@maharshi0143](https://github.com/maharshi0143)

## 🙏 Acknowledgments

- Built as part of the CDC Data Export System project
- Inspired by modern data pipeline architectures
- Uses best practices from Debezium and similar CDC tools

---

## 📚 Additional Resources

- [Change Data Capture Patterns](https://en.wikipedia.org/wiki/Change_data_capture)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Built with ❤️ using Node.js, Express, and PostgreSQL**
