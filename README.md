# Face Recognition Attendance

A lightweight Flask web app for managing student attendance. The SmartFace interface provides a dashboard, student list, attendance records, a camera-based attendance form, and daily summary reports.

> **Note:** The current face-photo analysis is a basic image-size and brightness quality check. It does not identify or verify a person's identity with a trained face-recognition model.

## Features

- Dashboard with student and attendance totals
- Student list and add-student form
- Attendance marking by name and roll number
- Optional photo capture from the browser camera when marking attendance
- Attendance history with record deletion
- Daily attendance and absent-student report
- JSON API for student, attendance, and statistics data

## Requirements

- Python 3.10 or later
- pip
- A modern browser; camera access requires localhost or HTTPS and user permission

## Run locally

1. Clone the repository and move into the project directory:

   ```bash
   git clone https://github.com/madhumitha9406/face-recognition-attendance.git
   cd face-recognition-attendance
   ```

2. Create and activate a virtual environment.

   **Windows PowerShell:**

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   **macOS / Linux:**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install Flask:

   ```bash
   python -m pip install Flask
   ```

4. Start the development server:

   ```bash
   python app.py
   ```

5. Open [http://127.0.0.1:5000](http://127.0.0.1:5000).

The app creates `static/uploads/` automatically for photos captured when marking attendance. Bootstrap Icons are loaded from a CDN, so an internet connection is needed for those icons.

## Pages

| Page | URL | Description |
| --- | --- | --- |
| Dashboard | `/` | Attendance overview and recent activity |
| Students | `/students` | View and add students |
| Attendance | `/attendance` | View and remove attendance records |
| Recognition | `/recognition` | Capture a photo and mark attendance |
| Reports | `/reports` | Daily attendance totals and absent students |

## API

All API responses are JSON.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/stats` | Get student, present, absent, and attendance-rate totals |
| `GET` | `/api/students` | List students |
| `POST` | `/api/students` | Add a student |
| `GET` | `/api/recent-attendance` | Get up to eight recent attendance records |
| `POST` | `/api/mark-attendance` | Mark or update attendance |
| `DELETE` | `/api/attendance/<roll>` | Delete an attendance record by roll number |

Example: add a student (photo is optional and, when supplied, should be a base64 data URL):

```bash
curl -X POST http://127.0.0.1:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Sam Lee","roll":"24CS001"}'
```

Example: mark attendance:

```bash
curl -X POST http://127.0.0.1:5000/api/mark-attendance \
  -H "Content-Type: application/json" \
  -d '{"name":"Sam Lee","roll":"24CS001"}'
```

The attendance API accepts either `roll` or `roll_number`; both `name` and a roll number are required.

## Data and limitations

Student and attendance records are stored in memory and reset when the server restarts. The app starts with sample students and attendance records. Captured attendance photos are saved as files under `static/uploads/`; the upload directory is excluded from Git.

Run this project for local development only. The built-in Flask server runs with debug mode enabled and is not intended for production deployment.
