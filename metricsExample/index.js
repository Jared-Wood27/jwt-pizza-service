const express = require('express');
const app = express();

const metrics = require('./metrics');
let greeting = 'hello';

app.use((req, res, next) => {
  //metrics.incrementRequests();
  metrics.incrementRequests(req.method); // Increment method-specific counter
  next();
});

app.use(express.json());

app.get('/hello/:name', (req, res) => {
  res.send({ [greeting]: req.params.name });
});

app.post('/greeting', (req, res) => {
  if (req.body.greeting) {
    greeting = req.body.greeting;
    res.send({ message: 'Greeting updated successfully', greeting });
  } else {
    res.status(400).send({ error: 'Greeting is required in the request body' });
  }
});

app.delete('/greeting', (req, res) => {
  greeting = 'hello'; // Reset to default greeting
  res.send({ message: 'Greeting reset to default', greeting });
});

app.listen(3000, function () {
  console.log(`Listening on port 3000`);
});