const sqlite = require('./src/databases/sqlite');
const Routes = require('./src/routers/index')
const express = require('express');
let http = require('http');
const app = express();

let server = null;

// Function to start the Express application
async function startApp(port)  {
    try {
        // Set the application port
        app.set('port', port);

        // Middleware to handle CORS and security headers
        app.use(function (req, res, next) {
            // Allow credentials such as cookies to be included in requests
            res.header('Access-Control-Allow-Credentials', true);

            // List of allowed domains (currently allowing all origins)
            var allowedDomains = ['*'];
            var origin = req.headers.origin;

            // Set CORS origin header if origin is allowed
            if (allowedDomains.indexOf(origin) > -1) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }

            // Set allowed HTTP methods for CORS
            res.header('Access-Control-Allow-Methods', 'GET,POST');

            // Allow all headers for CORS requests
            res.header('Access-Control-Allow-Headers', '*');

            // Set security policies for content sources
            res.setHeader('Content-Security-Policy',"default-src 'self' https:; " +"font-src 'self' https:; " +"img-src 'self' https:; " +"script-src 'self' https:; " +"style-src 'self' https:; " +"frame-src 'self' https:");

            // Prevent MIME-type sniffing
            res.set('X-Content-Type-Options', 'nosniff');

            // Prevent referrer header from being sent
            res.set('Referrer-Policy', 'no-referrer');

            // Enforce HTTPS with HSTS (1 year + preload)
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

            // Proceed to next middleware or route
            next();
        });

        // Middleware to parse URL-encoded bodies (up to 50MB)
        app.use(express.urlencoded({ limit: '50mb', extended: true }));

        // Middleware to parse JSON bodies (up to 50MB)
        app.use(express.json({ limit: '50mb' }));
        app.use('/v1', require('./src/routers/index'));
        // Health check endpoint
        app.get('/health', (req, res) => {
            return res.send('ok'); 
        });
        //establish db connection

        // Create and attach an HTTP server to the Express app
        server = http.createServer(app);
        let [sqliteState ] = await sqlite.connect();
        if(sqliteState) {
            console.log(`Apis running on port ${port}`)
            console.log('SQLITE connected successfully');
            server.listen(port);
            server.on('error', onError);
            server.on('listening', onListening);
        }
        // Middleware to handle unmatched routes (404 Not Found)
        app.use(function (req, res, next) {
            res.status(404).send();
        });

    } catch (err) {
        // Log any errors and exit the process
        console.log(err);
        process.exit(0);
    }
}
startApp(8080)
// Function to handle server errors
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // Handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            logger.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}
// Function to handle the server "listening" event
function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
}
