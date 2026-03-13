import app from './app.js';

const PORT = 3000;
const HOST = "localhost";
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});