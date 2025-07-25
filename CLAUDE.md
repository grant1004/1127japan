# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Japan Kansai Shikoku Travel Itinerary** web application with online editing capabilities. It's a full-stack application that allows users to view and edit a travel itinerary with real-time synchronization and notes functionality.

## Architecture

### Backend (server.js)
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL for data persistence
- **Real-time Updates**: Server-Sent Events (SSE) with database notifications (`LISTEN/NOTIFY`)
- **Data Structure**: Itinerary stored as JSONB in PostgreSQL with nested days/items structure
- **Features**: CRUD operations for itinerary items, notes management, drag-and-drop reordering

### Frontend 
- **Technology**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Structure**: 
  - `public/index.html` - Main HTML structure
  - `public/js/itinerary.js` - Core application logic, edit mode, drag-and-drop
  - `public/js/notification.js` - Real-time notification handling
  - `public/css/itinerary.css` - Styling
- **Key Features**: Edit mode toggle, drag-and-drop reordering, notes system with priorities

## Development Commands

### Start the application
```bash
npm start
# or 
npm run dev
```
Both commands run `node server.js` and start the server on port 3000 (or PORT environment variable).

### Install dependencies
```bash
npm install
```

### Database Setup
The application automatically initializes PostgreSQL tables on startup. Requires `DATABASE_URL` environment variable for production.

## Key Application Concepts

### Data Structure
- **Itinerary**: Contains title, subtitle, days array, and notes object
- **Days**: Each day has id, date, title, accommodation, and items array
- **Items**: Each item has id, type, time, name, activity
- **Notes**: Stored per item with priority (high/medium/low), description, content, and type (link/text)

### Edit Mode System
The application has two distinct modes:
- **View Mode**: Read-only display of the itinerary
- **Edit Mode**: Allows inline editing of all content, drag-and-drop reordering, adding/deleting items

### Real-time Synchronization
- Uses PostgreSQL `LISTEN/NOTIFY` for database change notifications
- Server-Sent Events (SSE) push updates to all connected clients
- Automatic conflict resolution and data synchronization

### API Endpoints
- `GET /api/itinerary` - Load complete itinerary data
- `POST /api/itinerary` - Save complete itinerary  
- `PUT /api/itinerary/item/:dayId/:itemId` - Update specific item
- `POST /api/itinerary/item/:dayId` - Add new item to day
- `DELETE /api/itinerary/item/:dayId/:itemId` - Delete item
- `GET/POST/PUT/DELETE /api/itinerary/notes/:itemId[/:noteId]` - Notes CRUD
- `PUT /api/itinerary/reorder` - Reorder items within day
- `PUT /api/itinerary/move-item` - Move item between days
- `GET /api/events` - SSE endpoint for real-time updates

## Important Implementation Details

### Database Connection
- Uses connection pooling with `pg` library
- Separate pools for main operations and notifications
- Automatic reconnection and error handling

### Drag and Drop
- Implemented in `itinerary.js` with `handleDragStart`, `handleDragOver`, `handleDrop`
- Supports both intra-day and inter-day item movement
- Visual feedback during drag operations

### Notes System
- Three priority levels: high (red), medium (yellow), low (green)
- Auto-detection of links vs text content
- Toggle panels with click-outside-to-close behavior

### Error Handling
- Graceful fallback to localStorage if server unavailable
- User-friendly error messages with status indicators
- Automatic retry mechanisms for failed operations

## Code Style Conventions
- Server-side: Modern Node.js with async/await
- Client-side: ES6+ features, modular function organization
- Database: JSONB for flexible schema, prepared statements for security
- CSS: BEM-style naming, responsive design with flexbox/grid

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (required for production)
- `PORT` - Server port (defaults to 3000)
- `NODE_ENV` - Environment setting (affects SSL configuration)

## File Structure Key Points
- `server.js` - Single-file backend with all routes and database logic
- `public/` - Static assets served by Express
- `data/` - Auto-created directory for JSON fallback (when DB unavailable)
- No build process required - direct file serving