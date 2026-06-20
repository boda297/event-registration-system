# Event Registration System

A full-stack web application built with Node.js and Express for creating, managing, and registering for events.

## Features
- **User Authentication**: Secure signup and login using JWT and password hashing (bcryptjs).
- **Event Management**: Create, view, update, and manage events.
- **Event Registration**: Users can browse and register for available events.

## Technologies Used
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: bcryptjs for password hashing
- **Environment**: dotenv for environment variables

## Project Structure
```text
├── controllers/    # Request handlers for routes
├── middleware/     # Custom middleware (e.g., authentication)
├── models/         # Mongoose database schemas
├── public/         # Static frontend files (HTML, CSS, JS)
├── routes/         # Express API route definitions
├── index.js        # Main application entry point
├── package.json    # Project dependencies and scripts
└── .env            # Environment variables (not tracked in git)
```

## Setup & Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/boda297/event-registration-system.git
   cd event-registration-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory and add the necessary variables:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Run the server:**
   - For development (with auto-reload): `npm run dev`
   - For production: `npm start`
