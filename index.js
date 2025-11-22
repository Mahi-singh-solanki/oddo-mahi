const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const body_parser = require("body-parser");

const app = express();
app.use(cors({ origin: "http://127.0.0.1:5500" }));
app.use(body_parser.json());

const { router: authRoutes, authenticateJWT } = require("./auth");
const { router: prodRoutes } = require("./product");
app.use(authRoutes);
app.use(prodRoutes);

mongoose.connect(
  "your url"
).then(() => console.log('MongoDB connected successfully!'))
.catch(err => console.error('MongoDB connection error:', err));

app.listen(8080, () => {
  console.log("Server running on http://localhost:8080");
});