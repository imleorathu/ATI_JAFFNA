# ATI Jaffna University Website

Full-stack university website scaffold built with React, Vite, Tailwind CSS, Node.js, Express, and MongoDB.

## Structure

```txt
ATI Jaffna/
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── Backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
└── README.md
```

## Frontend

```bash
cd Frontend
npm install
npm run dev
```

The Vite app includes Home, About, Faculties, Courses, Admissions, Student Dashboard, Admin Dashboard, News, and Contact views.

## Backend

```bash
cd Backend
npm install
copy .env.example .env
npm run dev
```

Update `.env` with your MongoDB connection string before starting the API.

## API Collections

Models and REST routes are included for:

- users
- students
- courses
- departments
- applications
- notices
- events
- contacts
- admins

Public create endpoints are available for applications and contacts. Admin-protected reads are configured for sensitive collections.
