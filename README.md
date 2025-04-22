# MCP Server for Redshift

A Model Context Protocol (MCP) server implementation for Amazon Redshift, providing a standardized interface for interacting with Redshift databases through AI models.

## Features

- List tables, views, and materialized views across multiple schemas
- Get detailed schema information for multiple tables in a single request
- Execute read-only SQL queries against Redshift
- Support for both stdio and SSE (Server-Sent Events) transport
- Type-safe implementation in TypeScript

## Prerequisites

- Node.js 18 or higher
- Access to a Redshift database
- Environment variables configured (see Configuration section)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mcp-server-redshift.git
   cd mcp-server-redshift
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Redshift Connection
REDSHIFT_HOST=your-redshift-host
REDSHIFT_PORT=5439
REDSHIFT_DATABASE=your-database
REDSHIFT_USER=your-username
REDSHIFT_PASSWORD=your-password
REDSHIFT_SCHEMAS=public,schema1,schema2  # Comma-separated list of schemas

# Server Configuration
TRANSPORT_TYPE=stdio  # or 'sse' for Server-Sent Events
PORT=3000  # Only used when TRANSPORT_TYPE=sse
```

## Usage

### Running the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Available Tools

1. **List Tables** (`list_tables`)
   - Lists all tables, views, and materialized views in specified schemas
   - Optional `schemas` parameter to filter by specific schemas
   ```json
   {
     "schemas": ["public", "analytics"]
   }
   ```

2. **Get Tables Schema** (`get_tables_schema`)
   - Get schema information for multiple tables across different schemas
   ```json
   {
     "tables": [
       { "schema": "public", "table": "users" },
       { "schema": "analytics", "table": "events" }
     ]
   }
   ```

3. **Query** (`query`)
   - Execute read-only SQL queries against the database
   ```json
   {
     "sql": "SELECT * FROM public.users LIMIT 5"
   }
   ```

### Testing

Run the test suite:
   ```bash
   npm test
   ```

## Architecture

The project is organized into the following structure:

```
src/
├── config/         # Configuration and database setup
├── tools/          # Individual tool implementations
├── server/         # Server setup and transport configuration
└── index.ts        # Main entry point
```

## Security Considerations

- All queries are executed in read-only transactions
- Environment variables should be properly secured
- CORS is enabled for SSE transport (should be configured for production)
- Database credentials should be managed securely

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This project is based on the [PostgreSQL MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres) from the Model Context Protocol project. Special thanks to the original authors for their work. 