# 🚗 RideSync

**RideSync** is a carpool and ride-sharing web & mobile application built for people who travel similar routes — especially daily office commuters. Users can offer rides, find rides along their route, book seats, and manage everything from a single dashboard.

The goal: make daily commuting easier, cheaper, and more efficient by connecting people traveling the same way.

---

## ✨ Features

- 🔐 **Secure authentication** — bcrypt password hashing + JWT-based sessions
- 🚘 **Offer a ride** — drivers list their route, vehicle, seats, and price per seat
- 🔍 **Find a ride** — search by route, date, and time
- 🎫 **Book a seat** — join a ride as a passenger with real-time seat tracking
- 📋 **My Rides dashboard** — view offered, joined, completed, and cancelled rides in one place
- ✏️ **Edit / Cancel / Delete rides** — full ride lifecycle management for drivers
- 🔄 **Automatic seat management** — seats update automatically as passengers join or leave
- 📱 **Cross-platform** — same codebase runs as a web app and a native Android app (via Capacitor)

---

## 📸 Screenshots

### 🌐 Web Application

| Landing Page | Landing Page |
|---|---| 
| ![Webapp](./Screenshots/Web%20View/Webapp.png) | ![Webapp2](./Screenshots/Web%20View/Webapp2.png) |

| Login Page | Register Page |
|---|---|
| ![Login](./Screenshots/Web%20View/Login.png) | ![Register](./Screenshots/Web%20View/Register.png) |

| Dashboard | Profile |
|---|---|
| ![Dashboard](./Screenshots/Web%20View/Dashboard.png) | ![Profile](./Screenshots/Web%20View/Profile.png) |

| Find Ride 
| ![Find Rides](./Screenshots/Web%20View/Find%20Rides.png) 

| Offer Rides | Offer Rides |
|---|---|
| ![Offer Rides](./Screenshots/Web%20View/Offer%20Rides.png) | ![Offer Rides 2](./Screenshots/Web%20View/Offer%20Rides2.png) |

| My Rides | My Rides |
|---|---|
| ![My Rides](./Screenshots/Web%20View/My%20Rides.png) | ![My Rides2](./Screenshots/Web%20View/My%20Rides2.png) |

| Ride Details | Ride Details |
|---|---|
| ![Ride Details](./Screenshots/Web%20View/Ride%20Details.png) | ![Ride Details2](./Screenshots/Web%20View/Ride%20Details2.png) |

---

## 🛠️ Tech Stack

**Frontend**
- React.js + Vite
- Tailwind CSS
- React Router
- Capacitor (Android app packaging)

**Backend**
- Node.js + Express.js
- PostgreSQL
- JWT (jsonwebtoken) + bcrypt for authentication
- REST API architecture

---

## 📁 Project Structure

```
ridesync/
├── backend/
│   ├── config/          # DB connection, JWT config
│   ├── middleware/       # Auth middleware
│   ├── routes/           # rides, bookings, users API routes
│   └── server.js
├── frontend/
│   ├── android/          # Capacitor Android native project (generated, gitignored)
│   ├── src/
│   │   ├── context/       # Auth & Ride context providers
│   │   ├── pages/          # Dashboard, FindRide, OfferRide, MyRides, etc.
│   │   ├── components/
│   │   └── utils/
│   └── capacitor.config.json
└── README.md
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed locally

### 1. Clone the repo
```bash
git clone https://github.com/ved1501/ridesync.git
cd ridesync
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```
JWT_SECRET=your_random_secret_here
```

Set up your local PostgreSQL database (`ridesync_db`) with the required tables (`users`, `rides`, `bookings`), then start the server:
```bash
node server.js
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```
VITE_API_URL=http://localhost:5000/api
```

Run the dev server:
```bash
npm run dev
```

### 4. Mobile (Android) build
```bash
npm run build
npx cap sync
npx cap open android
```
Then run from Android Studio.

---

## 🔒 Security

- Passwords are hashed with **bcrypt** before storage — never stored in plain text
- All ride/booking mutation routes are protected with **JWT authentication**
- Ownership checks ensure users can only edit/cancel/delete their own rides and bookings

---

## 📄 License

This project is for educational purposes.

---

Built with ❤️ by [Ved Rahangdale](https://github.com/ved1501)
