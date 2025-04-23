const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mealRoutes = require('./routes/mealRoutes'); 

const app = express();
const port = 5000;
 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

app.use('/api', mealRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`For Android emulator, use API URL: http://10.0.2.2:${port}/api`);
});
