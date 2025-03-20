const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const PORT = 3069;
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Create server
const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = path.join(__dirname, parsedUrl.pathname);

  // Handle root path
  if (pathname === path.join(__dirname, '/')) {
    pathname = path.join(__dirname, '/index.html');
  }

  // Special handling for the SDK dist folder
  if (pathname.includes('/dist/')) {
    pathname = pathname.replace(path.join(__dirname, '/dist'), path.join(__dirname, '..', '/dist'));
  }

  // Check if file exists
  fs.stat(pathname, (err, stats) => {
    if (err) {
      // File not found
      res.statusCode = 404;
      res.end(`File ${pathname} not found!`);
      return;
    }

    // Is it a directory?
    if (stats.isDirectory()) {
      pathname = path.join(pathname, 'index.html');
    }

    // Read file
    fs.readFile(pathname, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end(`Error getting the file: ${err}.`);
        return;
      }

      // Set content type based on file extension
      const ext = path.parse(pathname).ext;
      res.setHeader('Content-type', CONTENT_TYPES[ext] || 'text/plain');

      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
      res.setHeader('Access-Control-Allow-Headers', '*');

      // Send response
      res.end(data);
    });
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Example app: http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to terminate.');
});
