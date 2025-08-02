# Wisp Proxy with Scramjet

This project is a high-performance web proxy utilizing the Wisp protocol, powered by a Scramjet-enhanced data stream engine. It leverages the Bare server for handling HTTP requests and integrates with the Ultraviolet proxy framework for a seamless and robust browsing experience.

## Features

- **Wisp Protocol Support:** Uses `wisp-server-node` for efficient WebSocket-based proxying.
- **Bare Server Integration:** Employs `@tomphttp/bare-server-node` to manage and route HTTP traffic effectively.
- **Ultraviolet Framework:** Serves the necessary static files for the Ultraviolet proxy frontend.
- **Modular Design:** Integrates various components from the Mercury Workshop ecosystem, including Epoxy Transport, Bare Mux, and Scramjet for stream processing.
- **Static File Serving:** Uses Express to serve the frontend application and associated proxy scripts.
- **Graceful Shutdown:** Ensures clean termination of the server and its processes.

## Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- A package manager like `npm` or `pnpm`

### Installation

1. Clone the repository:
   ```sh
   git clone <your-repository-url>
   cd proxy-v5
   ```

2. Install the dependencies. You can use either npm or pnpm:
   - Using npm:
     ```sh
     npm install
     ```
   - Using pnpm:
     ```sh
     pnpm install
     ```

### Running the Application

To start the proxy server, run the following command:

```sh
npm start
```

The server will start, and you can see the listening address in the console:

```
Listening on:
    http://localhost:8080
    http://127.0.0.1:8080
```

## How It Works

The `server.js` file initializes an Express application and an HTTP server.

- **Static Files:** The `public` directory contains the frontend files, including `index.html` and the necessary client-side scripts for the proxy. The server is configured to serve these files, along with the required assets for Ultraviolet, Epoxy, Scramjet, and Bare Mux.
- **Request Routing:** The main HTTP server listens for incoming `request` and `upgrade` events.
  - **HTTP Requests:** If a request is identified as a Bare request, it is routed to the Bare server instance. Otherwise, it is handled by the Express app, which serves the static frontend.
  - **WebSocket Upgrades:** Upgrade requests are routed to the appropriate handler based on the URL. Wisp requests (containing `/wisp/`) are handled by the Wisp server, while Bare requests are routed to the Bare server.

## Key Dependencies

- **`express`**: Web framework for serving static files and handling basic HTTP requests.
- **`@tomphttp/bare-server-node`**: The core Bare server implementation for Node.js.
- **`wisp-server-node`**: The Wisp server for handling WebSocket proxy connections.
- **`@titaniumnetwork-dev/ultraviolet`**: Provides the client-side scripts for the Ultraviolet proxy.
- **`@mercuryworkshop/*`**: A suite of libraries for advanced proxy functionalities, including:
  - `@mercuryworkshop/epoxy-transport`
  - `@mercuryworkshop/bare-mux`
  - `@mercuryworkshop/scramjet`

## License

This project is licensed under the ISC License. See the `package.json` file for details.
