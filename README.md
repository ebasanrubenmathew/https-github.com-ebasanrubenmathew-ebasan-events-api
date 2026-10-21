# School Events API

A RESTful API built with Express.js for managing school organization events (create, read, update, delete).

## Technologies Used
- Node.js
- Express.js
- Postman (testing)
- GitHub (source control)
- Render (deployment)

## Run Locally
```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_REPO_FOLDER
npm install
npm start
```
The server runs at http://localhost:3000

## Endpoints
| Method | Route | Purpose |
|--------|-------|---------|
| GET | / | API status check |
| GET | /api/events | Get all events |
| GET | /api/events/:id | Get one event |
| POST | /api/events | Create an event |
| PUT | /api/events/:id | Replace an event (all required fields) |
| PATCH | /api/events/:id | Update some fields of an event |
| DELETE | /api/events/:id | Delete an event |

## Example Request Body (POST /api/events)
```json
{
  "title": "Science Fair",
  "date": "2026-12-01",
  "location": "Main Hall",
  "organizer": "Science Club"
}
```

## Status Codes
200 OK, 201 Created, 400 Bad Request (validation/invalid ID/invalid JSON), 404 Not Found

## Links
- GitHub Repository: YOUR_GITHUB_REPOSITORY_URL
- Render Deployment: https://your-service-name.onrender.com

## Known Limitations
- Data is stored in an in-memory array, so it is temporary and resets when the server restarts or Render replaces the instance.
- No authentication or database.
- Free Render services may take ~30–60 seconds to wake up after being idle.
