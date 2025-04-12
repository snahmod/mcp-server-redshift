# MCP Server for Amazon Redshift

A Model Context Protocol (MCP) server implementation for Amazon Redshift, allowing AI models to interact with Redshift databases through a standardized interface.

## Features

- Connect to Amazon Redshift databases
- List tables, views, and materialized views
- Retrieve schema information for database objects
- Execute read-only SQL queries
- Environment variable configuration
- Schema filtering support

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Access to an Amazon Redshift cluster

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/snahmod/mcp-server-redshift.git
   cd mcp-server-redshift
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your Redshift connection details:
   ```
   REDSHIFT_HOST=your-cluster.region.redshift.amazonaws.com
   REDSHIFT_PORT=5439
   REDSHIFT_DATABASE=your_database
   REDSHIFT_USER=your_username
   REDSHIFT_PASSWORD=your_password
   REDSHIFT_SCHEMAS=public,schema1,schema2
   ```

## Usage

### Starting the Server

```bash
npm start
```

The server will start and listen for MCP client connections.

### Testing

Run the test client to verify the server functionality:

```bash
npm test
```

The test client will:
1. Start the MCP server
2. List all tables, views, and materialized views
3. Get schema information for a table
4. Get schema information for a view (if available)
5. Execute a count query on a table
6. Execute a simple query

### Building

Build the TypeScript code:

```bash
npm run build
```

## Development

### Project Structure

- `src/` - Source code
  - `index.ts` - Main server implementation
  - `types.ts` - TypeScript type definitions
- `test/` - Test files
  - `client.ts` - Test client for verifying server functionality
- `dist/` - Compiled JavaScript code (generated)

### Adding New Features

1. Implement new functionality in `src/index.ts`
2. Add appropriate tests in `test/client.ts`
3. Update documentation in `README.md`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 