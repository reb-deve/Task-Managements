const app = require('./app');
const cluster = require('cluster');
const os = require('os');

// Get the number of CPU cores
const numCPUs = os.cpus().length;

if (cluster.isMaster && process.env.NODE_ENV === 'production') {
    console.log(`Master process ${process.pid} is running`);

    // Fork workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        // Replace the dead worker
        cluster.fork();
    });
} else {
    // Workers share the TCP connection
    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} - Worker ${process.pid}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        console.error('Unhandled Promise Rejection:', err);
        // In production, you might want to do some cleanup before exiting
        if (process.env.NODE_ENV === 'production') {
            server.close(() => {
                process.exit(1);
            });
        }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        // In production, you might want to do some cleanup before exiting
        if (process.env.NODE_ENV === 'production') {
            server.close(() => {
                process.exit(1);
            });
        }
    });
} 