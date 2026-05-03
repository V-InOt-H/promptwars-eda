import app from './app.js';

const PORT = parseInt(process.env.PORT, 10) || 8080;

app.listen(PORT, () => {
  console.log(`[Elite Server] Running on port ${PORT} (ESM Mode)`);
});
