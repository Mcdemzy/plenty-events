# Plenty Events Backend API

A comprehensive Node.js backend API for the Plenty Events platform where users can hire vendors (caterers, decorators, etc.) and vendors can hire waiters for their events.

## Features

- **Multi-role Authentication** (Users, Vendors, Waiters, Admins)
- **User Management** with profile creation and updates
- **Vendor Services** with categories, ratings, and bookings
- **Waiter Services** with expertise areas and job applications
- **Booking System** for users to hire vendors
- **Job System** for vendors to hire waiters
- **Rating & Review System** for both vendors and waiters
- **Email Notifications** with Gmail integration
- **File Upload Support** for portfolios and documents
- **Advanced Search & Filtering**
- **Rate Limiting & Security** features
- **MongoDB Database** with Mongoose ODM

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **Email:** Nodemailer with Gmail
- **Validation:** Express Validator
- **Security:** Helmet, CORS, Rate Limiting
- **File Upload:** Multer (ready for Cloudinary integration)
- **Deployment:** Vercel-ready configuration

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd plenty-events-backend
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plenty-events

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password

# Cloudinary Configuration (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

Run the setup script to initialize reference data and create an admin user:

```bash
npm run setup
```

This will create:

- Vendor categories (Catering, Photography, etc.)
- Waiter expertise areas (Serving, Bartending, etc.)
- Event types (Wedding, Corporate, etc.)
- Admin user (admin@plentyevents.com / Admin@123)

### 4. Development

```bash
# Start development server
npm run dev

# Start production server
npm start
```

The API will be available at `http://localhost:5000`

## API Documentation

### Base URL

- Development: `http://localhost:5000/api`
- Production: `https://your-vercel-domain.vercel.app/api`

### Authentication Endpoints

| Method | Endpoint                      | Description            | Access  |
| ------ | ----------------------------- | ---------------------- | ------- |
| POST   | `/auth/register`              | Register new user      | Public  |
| POST   | `/auth/login`                 | User login             | Public  |
| POST   | `/auth/logout`                | User logout            | Private |
| GET    | `/auth/profile`               | Get user profile       | Private |
| PUT    | `/auth/profile`               | Update user profile    | Private |
| POST   | `/auth/forgot-password`       | Request password reset | Public  |
| POST   | `/auth/reset-password/:token` | Reset password         | Public  |
| PUT    | `/auth/update-password`       | Update password        | Private |

### Vendor Endpoints

| Method | Endpoint              | Description           | Access           |
| ------ | --------------------- | --------------------- | ---------------- |
| GET    | `/vendors`            | List all vendors      | Public           |
| GET    | `/vendors/:id`        | Get vendor details    | Public           |
| PUT    | `/vendors/profile`    | Update vendor profile | Private (Vendor) |
| POST   | `/vendors/:id/rate`   | Rate a vendor         | Private (User)   |
| POST   | `/vendors/:id/hire`   | Hire a vendor         | Private (User)   |
| GET    | `/vendors/orders`     | Get vendor orders     | Private (Vendor) |
| GET    | `/vendors/orders/:id` | Get order details     | Private (Vendor) |
| PUT    | `/vendors/orders/:id` | Update order status   | Private (Vendor) |

### Waiter Endpoints

| Method | Endpoint            | Description           | Access           |
| ------ | ------------------- | --------------------- | ---------------- |
| GET    | `/waiters`          | List all waiters      | Public           |
| GET    | `/waiters/:id`      | Get waiter details    | Public           |
| PUT    | `/waiters/profile`  | Update waiter profile | Private (Waiter) |
| POST   | `/waiters/:id/rate` | Rate a waiter         | Private (Vendor) |
| POST   | `/waiters/:id/hire` | Hire a waiter         | Private (Vendor) |
| GET    | `/waiters/jobs`     | Get waiter jobs       | Private (Waiter) |
| GET    | `/waiters/jobs/:id` | Get job details       | Private (Waiter) |
| PUT    | `/waiters/jobs/:id` | Update job status     | Private (Waiter) |

### Reference Data Endpoints

| Method | Endpoint      | Description           | Access |
| ------ | ------------- | --------------------- | ------ |
| GET    | `/categories` | Get vendor categories | Public |
| GET    | `/expertise`  | Get waiter expertise  | Public |
| GET    | `/events`     | Get event types       | Public |

### Admin Endpoints

| Method | Endpoint                   | Description          | Access          |
| ------ | -------------------------- | -------------------- | --------------- |
| GET    | `/admin/users`             | List all users       | Private (Admin) |
| GET    | `/admin/vendors`           | List all vendors     | Private (Admin) |
| GET    | `/admin/waiters`           | List all waiters     | Private (Admin) |
| PUT    | `/admin/users/:id/approve` | Approve user account | Private (Admin) |
| DELETE | `/admin/users/:id`         | Delete user account  | Private (Admin) |

## User Registration Flow

### For Regular Users

```javascript
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "password": "Password123",
  "role": "user"
}
```

### For Vendors

```javascript
POST /api/auth/register
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+2348012345679",
  "password": "Password123",
  "role": "vendor"
}
```

### For Waiters

```javascript
POST /api/auth/register
{
  "firstName": "Mike",
  "lastName": "Johnson",
  "email": "mike@example.com",
  "phone": "+2348012345680",
  "password": "Password123",
  "role": "waiter"
}
```

## Waiter Application Details

After registration, waiters can complete their profile with the application form details:

```javascript
PUT /api/waiters/profile
{
  "expertise": ["expertiseId1", "expertiseId2"],
  "yearsOfExperience": 3,
  "hourlyRate": 2000,
  "applicationDetails": {
    "highestEducation": "Secondary School",
    "hasWorkedAsBefore": true,
    "previousExperience": "Worked at XYZ Restaurant for 2 years",
    "hasHospitalityTraining": true,
    "canWorkEvenings": true,
    "canWorkWeekends": true,
    "canWorkHolidays": true,
    "canWorkUnderPressure": true,
    "hasBeenConvicted": false,
    "usesSubstances": false,
    "nextOfKin": {
      "name": "John Doe",
      "relationship": "Father",
      "phone": "+2348012345681"
    },
    "guarantor": {
      "fullName": "Jane Doe",
      "relationship": "Sister",
      "address": "123 Main St, Lagos",
      "phone": "+2348012345682",
      "email": "jane@example.com",
      "occupation": "Teacher"
    }
  }
}
```

## Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the App Password (not your regular password) in the `EMAIL_PASS` environment variable

## Deployment on Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Configure Environment Variables

Add all your `.env` variables in Vercel dashboard or using CLI:

```bash
vercel env add NODE_ENV
vercel env add MONGODB_URI
vercel env add JWT_SECRET
# ... add all other env variables
```

### 3. Deploy

```bash
vercel --prod
```

The `vercel.json` configuration is already included in the project.

## Security Features

- **Rate Limiting**: Prevents API abuse
- **CORS**: Configured for cross-origin requests
- **Helmet**: Sets security headers
- **Data Sanitization**: Prevents NoSQL injection
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Uses bcryptjs
- **Input Validation**: Express-validator for all inputs

## File Upload Support

The API is ready for file uploads with:

- Multer middleware for handling multipart/form-data
- Cloudinary integration (configure your credentials)
- File type and size validation
- Portfolio images for vendors
- Document uploads for waiters

## Error Handling

Comprehensive error handling with:

- Custom error classes
- Async error catching
- Validation error formatting
- MongoDB error parsing
- Development vs production error responses

## Database Models

### User Model

- Basic user information
- Role-based access (user, vendor, waiter, admin)
- Profile management
- Authentication data

### Vendor Model

- Business information
- Categories and services
- Location and pricing
- Portfolio and ratings
- Booking statistics

### Waiter Model

- Professional information
- Expertise areas and skills
- Application form details
- Availability and rates
- Job history and ratings

### Booking Models

- **Order**: User hiring Vendor
- **Job**: Vendor hiring Waiter
- Status tracking and management
- Payment information
- Communication threads

### Rating Model

- Vendor and waiter ratings
- Review text and breakdown ratings
- Photo attachments
- Response system

## API Response Format

### Success Response

```javascript
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "count": 10, // For list endpoints
  "total": 100, // For paginated endpoints
  "pagination": {
    "next": { "page": 2, "limit": 10 },
    "prev": { "page": 1, "limit": 10 }
  }
}
```

### Error Response

```javascript
{
  "success": false,
  "message": "Error message",
  "errors": [ // For validation errors
    {
      "field": "email",
      "message": "Please provide a valid email",
      "value": "invalid-email"
    }
  ]
}
```

## Search and Filtering

### Vendor Search

```
GET /api/vendors?search=catering&category=categoryId&location=Lagos&rating=4&minPrice=10000&maxPrice=50000&sortBy=rating&order=desc
```

### Waiter Search

```
GET /api/waiters?expertise=expertiseId&location=Lagos&rating=4&minRate=1500&maxRate=3000&sortBy=rating
```

## Status Workflows

### Order Status Flow

```
pending → confirmed → in-progress → completed
       ↓
   cancelled/refunded
```

### Job Status Flow

```
pending → accepted → in-progress → completed
       ↓
   declined/cancelled
```

## Testing the API

### 1. Register Test Users

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "testuser@example.com",
    "phone": "+2348012345678",
    "password": "Password123",
    "role": "user"
  }'

# Register a vendor
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Vendor",
    "email": "testvendor@example.com",
    "phone": "+2348012345679",
    "password": "Password123",
    "role": "vendor"
  }'
```

### 2. Login and Get Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Password123"
  }'
```

### 3. Use Token for Protected Routes

```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Production

```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
```

## Database Indexing

The API includes optimized database indexes for:

- User email and phone lookups
- Vendor location-based searches
- Rating and booking queries
- Category and expertise filtering

## Monitoring and Logging

- **Morgan**: HTTP request logging in development
- **Console Logging**: Structured error and info logs
- **Email Failure Handling**: Graceful email sending failures
- **Database Connection Monitoring**: Connection status tracking

## Performance Optimizations

- **Pagination**: All list endpoints support pagination
- **Selective Population**: Only necessary fields are populated
- **Aggregation Pipelines**: Efficient statistics calculations
- **Compression**: Response compression middleware
- **Rate Limiting**: Prevents API abuse

## Common Issues & Solutions

### 1. MongoDB Connection Issues

```bash
# Check MongoDB URI format
mongodb+srv://username:password@cluster.mongodb.net/database-name

# Ensure IP whitelist includes your deployment IP
# For Vercel, whitelist 0.0.0.0/0 or use specific IPs
```

### 2. Email Not Sending

```bash
# Verify Gmail App Password (not regular password)
# Enable 2FA and generate App Password
# Check EMAIL_USER and EMAIL_PASS in environment variables
```

### 3. JWT Token Issues

```bash
# Ensure JWT_SECRET is at least 32 characters
# Check token format: "Bearer YOUR_TOKEN_HERE"
# Verify token hasn't expired
```

### 4. Validation Errors

```bash
# Check API documentation for required fields
# Ensure data types match expected formats
# Verify enum values are correct
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, email support@plentyevents.com or create an issue in the repository.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## Next Steps After Setup

1. **Test the API**: Use the provided curl examples or Postman
2. **Frontend Integration**: Connect your React/Vue/Angular frontend
3. **Email Templates**: Customize email templates in `utils/emailService.js`
4. **File Upload**: Configure Cloudinary for production file uploads
5. **Payment Integration**: Add payment gateway (Paystack, Flutterwave, etc.)
6. **Push Notifications**: Implement Firebase/Pusher for real-time updates
7. **Analytics**: Add Google Analytics or custom analytics
8. **Caching**: Implement Redis for frequently accessed data
9. **Documentation**: Generate API docs using Swagger/OpenAPI

Happy coding! 🚀
