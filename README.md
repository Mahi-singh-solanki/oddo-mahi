Stocker - Inventory Management System
Stocker is a full-stack inventory management application designed to track products, manage stock levels, handle purchase/sales orders, and track deliveries. It features a RESTful Node.js backend and a lightweight, vanilla JavaScript frontend.

🚀 Features
User Authentication: Secure Signup and Login using JWT (JSON Web Tokens) and BCrypt.

Dashboard: Real-time overview of total products, orders, warehouses, and Low Stock Alerts.

Product Management:

Add, Edit, Delete products.

Real-time Search by SKU or Name.

Update stock levels manually.

Order Processing:

Received Orders (Purchase): automatically increases stock. Handles new product creation on the fly.

Sent Orders (Sales): automatically decreases stock and generates a delivery entry.

Delivery Tracking: Manage shipping status (Pending, In Transit, Delivered, etc.) for outgoing orders.

Warehouse & Transfers: Manage multiple warehouse locations and transfer stock between them.

Responsive UI: Clean, light-themed interface built with raw CSS and HTML.

🛠️ Tech Stack
Backend:

Node.js & Express.js

MongoDB (Mongoose ODM)

Authentication: JSON Web Tokens (JWT) & Bcryptjs

Body-Parser & CORS

Frontend:

HTML5

CSS3 (Custom styling, no frameworks)

JavaScript (ES6+, Fetch API)

📂 Project Structure
/stocker
│
├── /backend
│   ├── index.js         # Entry point, DB connection, Server setup
│   ├── auth.js          # Auth routes (Login, Signup, Me)
│   ├── product.js       # Product, Order, Warehouse, Delivery routes
│   └── package.json     # Dependencies
│
└── /frontend
    ├── index.html       # Main UI (SPA structure)
    ├── style.css        # Styling
    └── script.js        # Frontend logic, API calls, DOM manipulation
⚙️ Installation & Setup
1. Backend Setup
Navigate to the backend directory.

Initialize the project and install dependencies:

Bash

npm init -y
npm install express mongoose cors body-parser jsonwebtoken bcryptjs webidl-conversions
Open index.js and ensure the CORS origin matches your frontend URL (default is set to VS Code Live Server port):

JavaScript

app.use(cors({ origin: "http://127.0.0.1:5500" }));
Start the server:

Bash

node index.js
Server runs on http://localhost:8080

2. Frontend Setup
Navigate to the frontend folder.

Important: Due to CORS policies, you cannot simply double-click index.html. You must serve it.

Recommended: Use VS Code Live Server.

Open the folder in VS Code.

Right-click index.html -> "Open with Live Server".

Ensure it opens on port 5500 (e.g., http://127.0.0.1:5500).

📖 Usage Guide
Authentication
Sign Up: Create a new account using an Email, Login ID, and Password.

Login: Access the dashboard using your Login ID and Password.

Managing Inventory
Go to the Products tab.

Click + Add Product to create new items.

Use the Search Box to filter products by SKU or Name.

Click Update to change stock levels manually.

Creating Orders
Go to the Orders tab and click + Create Order.

Received (Purchase): Adds stock. If you enter a new SKU, you must provide Name, Category, and Price to create the product automatically.

Sent (Sales): Deducts stock. Requires Recipient Name and Address for delivery tracking.

🔌 API Endpoints
Method	Endpoint	Description
POST	/auth/signup	Register new user
POST	/auth/login	Login user
GET	/products	Get all products
POST	/product	Add new product
PUT	/products/:id	Update product details/stock
POST	/orders/receipt	Create Purchase or Sales order
GET	/orders/delivery	Get delivery statuses
PUT	/delivery/:id	Update delivery status

Export to Sheets

🛡️ Environment Variables (Optional Best Practice)
Currently, the MongoDB URI is hardcoded in index.js. For security, it is recommended to use a .env file:

npm install dotenv

Create .env file: MONGO_URI=your_connection_string

Update index.js: mongoose.connect(process.env.MONGO_URI)

🤝 Contributing
Feel free to fork this project and submit pull requests.

📄 License
This project is open-source and available for educational purposes.