# Zoom Clone - Video Conferencing Platform

A full-stack video conferencing web application that replicates Zoom's design, user experience, and core meeting workflows. Built with Next.js frontend and Python FastAPI backend.

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - State management

### Backend
- **Python 3.8+** - Programming language
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **SQLite** - Lightweight database
- **Pydantic** - Data validation using Python type annotations

## Features

### Core Features (Implemented)
1. **Landing Dashboard**
   - Clean professional Zoom-like UI
   - Navbar with profile/settings placeholders
   - New Meeting, Join Meeting, and Schedule Meeting buttons
   - Upcoming meetings section
   - Recent meetings section

2. **Instant Meeting Creation**
   - Create new meetings instantly
   - Generate unique 10-digit Meeting ID
   - Generate shareable invite link
   - Redirect user to meeting room

3. **Join Meeting**
   - Join using Meeting ID
   - Enter display name before joining
   - Validate meeting existence

4. **Schedule Meetings**
   - Create scheduled meetings with title/description
   - Date & Time picker
   - Duration selection
   - Auto-generate meeting link
   - Store in database
   - Show in Upcoming Meetings section

5. **Meeting Room Interface**
   - Video/Audio controls (mute, video on/off)
   - Screen sharing capability
   - Participant grid view
   - Participant sidebar
   - Meeting info display
   - Copy invite link functionality

### Database Schema

#### Users Table
- `id` - Primary key
- `name` - User's full name
- `email` - Unique email address
- `display_name` - Display name in meetings
- `created_at` - Account creation timestamp

#### Meetings Table
- `id` - Primary key
- `meeting_id` - Unique 10-digit meeting identifier
- `title` - Meeting title
- `description` - Meeting description (optional)
- `host_id` - Foreign key to users table
- `scheduled_time` - Scheduled meeting datetime (optional)
- `duration` - Meeting duration in minutes (optional)
- `is_active` - Meeting status flag
- `created_at` - Meeting creation timestamp

#### Participants Table
- `id` - Primary key
- `meeting_id` - Foreign key to meetings table
- `user_id` - Foreign key to users table
- `joined_at` - Join timestamp
- `is_muted` - Mute status
- `is_video_on` - Video status

## Project Structure

```
zoom-clone/
├── backend/
│   ├── main.py              # FastAPI application and endpoints
│   ├── database.py          # Database connection configuration
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic schemas for validation
│   ├── requirements.txt     # Python dependencies
│   └── zoom_clone.db        # SQLite database (created on run)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                 # Landing dashboard
│   │   │   ├── meeting/
│   │   │   │   └── [meetingId]/
│   │   │   │       └── page.tsx         # Meeting room
│   │   │   ├── globals.css              # Global styles
│   │   │   └── layout.tsx               # Root layout
│   │   └── components/
│   │       ├── Navbar.tsx               # Navigation bar
│   │       ├── MeetingCard.tsx           # Meeting card component
│   │       ├── NewMeetingModal.tsx       # New meeting modal
│   │       ├── JoinMeetingModal.tsx      # Join meeting modal
│   │       └── ScheduleMeetingModal.tsx # Schedule meeting modal
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- pip (Python package manager)

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment (optional but recommended)**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the FastAPI server**
```bash
python main.py
```

The backend will start on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

## API Endpoints

### Users
- `POST /api/users/` - Create a new user
- `GET /api/users/{user_id}` - Get user by ID

### Meetings
- `POST /api/meetings/instant?host_id={id}` - Create instant meeting
- `POST /api/meetings/schedule?host_id={id}` - Schedule a meeting
- `GET /api/meetings/{meeting_id}` - Get meeting by ID
- `GET /api/meetings/user/{user_id}/upcoming` - Get upcoming meetings
- `GET /api/meetings/user/{user_id}/recent` - Get recent meetings
- `GET /api/meetings/{meeting_id}/participants` - Get meeting participants
- `POST /api/meetings/join` - Join a meeting
- `POST /api/meetings/{meeting_id}/end` - End a meeting

### Database
- `POST /api/seed` - Seed database with sample data

## Usage

1. **Start both servers** (backend on port 8000, frontend on port 3000)

2. **Open the application** at `http://localhost:3000`

3. **Create an instant meeting**
   - Click "New Meeting" button
   - Confirm to start
   - You'll be redirected to the meeting room

4. **Join a meeting**
   - Click "Join Meeting" button
   - Enter the 10-digit Meeting ID
   - Enter your display name
   - Click "Join Meeting"

5. **Schedule a meeting**
   - Click "Schedule Meeting" button
   - Enter meeting details (title, description, date/time, duration)
   - Click "Schedule"
   - Meeting appears in "Upcoming Meetings"

6. **In the meeting room**
   - Use control bar to mute/unmute microphone
   - Toggle video on/off
   - Share screen
   - View participants in sidebar
   - Copy invite link
   - Leave meeting

## Assumptions

1. **No Authentication**: The application assumes a default user (user_id = 1) is logged in. Authentication is not implemented as per requirements.

2. **WebRTC**: The current implementation uses browser's MediaDevices API for local video/audio. Real-time peer-to-peer video streaming would require WebRTC implementation with a signaling server.

3. **Database**: SQLite is used for simplicity. For production, consider PostgreSQL or MySQL.

4. **Sample Data**: The application automatically seeds the database with sample users and meetings on first load.

5. **Meeting ID**: 10-digit numeric meeting IDs are generated randomly.

## Future Enhancements (Bonus Features)

- User authentication (Login/Signup)
- Real-time video streaming with WebRTC
- Chat functionality during meetings
- Recording meetings
- Host controls (mute all, remove participant)
- Waiting room feature
- Breakout rooms
- Responsive design improvements for mobile devices
- Meeting analytics and history

## Deployment

### Backend Deployment (Render/Railway)
1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python main.py`
5. Deploy

### Frontend Deployment (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `frontend`
4. Add environment variable for API URL
5. Deploy

## Troubleshooting

**Backend won't start**: Ensure Python 3.8+ is installed and all dependencies are installed.

**Frontend can't connect to backend**: Ensure backend is running on port 8000 and CORS is configured correctly.

**Video/Audio not working**: Ensure browser has permission to access camera and microphone.

**Database errors**: Delete `zoom_clone.db` and restart the backend to recreate the database.

## License

This project is created for educational purposes as part of a fullstack assignment.

## Author

Built as a fullstack assignment demonstrating proficiency in Next.js, FastAPI, and modern web development practices.
