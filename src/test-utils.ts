import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export function mockStdioServerTransport() {
  const transport = new StdioServerTransport();
  
  // Add sendRequest method to transport
  (transport as any).sendRequest = async (request: any) => {
    return new Promise((resolve) => {
      resolve({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [{
            type: "text",
            text: ""
          }],
          isError: false
        }
      });
    });
  };

  return transport;
} 