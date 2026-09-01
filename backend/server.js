const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
Server is running on: http://0.0.0.0:${PORT} (LAN Access Enabled)
Environment: ${process.env.NODE_ENV || 'development'}
  `);
});
