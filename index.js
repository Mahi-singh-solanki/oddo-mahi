const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const body_parser = require("body-parser");

const app = express();
app.use(cors({ origin: "stocker-odoo.netlify.app" }));
app.use(body_parser.json());

const { router: authRoutes, authenticateJWT } = require("./auth");
const { router: prodRoutes } = require("./product");
app.use(authRoutes);
app.use(prodRoutes);

mongoose.connect(
  "mongodb+srv://mahipalsinghapsit0:msdonrajputana@cluster0.am95irj.mongodb.net/stocker"
).then(() => console.log('MongoDB connected successfully!'))
.catch(err => console.error('MongoDB connection error:', err));

app.listen(8080, () => {
  console.log("Server running on http://localhost:8080");
});