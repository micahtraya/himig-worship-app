# HIMIG — Worship Songbook & Team Management Platform

**HIMIG** is a full-stack worship songbook and team management platform designed to help worship teams organize songs, manage setlists, prepare for services, and access musical resources from desktop and mobile devices.

Built for **KCCC Psalmist**, HIMIG combines a modern web application experience with Supabase authentication, database storage, role-based permissions, worship-service tools, and a mobile-friendly PWA experience.

> **HIMIG — Praise and Worship Songbook**

---

## ✨ Features

### 🎵 Song Library

* Shared worship song library
* Song details including:

  * Lyrics
  * Chords
  * Key
  * Artist
  * Language
  * Category
  * BPM
  * Time signature
  * Nashville Number Code
  * Tabs
* Add and edit songs according to team permissions
* Song search and browsing
* Individual song pages

### 🎼 Chord & Key Transposition

HIMIG includes a dedicated chord engine that supports:

* Key-aware chord transposition
* Sharp and flat notation
* Major and minor chords
* Chord qualities and extensions
* Slash chords
* Key normalization
* Automatic musical note spelling preferences

This allows musicians to quickly adapt songs to the required service key.

### 📋 Setlists

Teams can create and manage shared worship setlists.

Setlist functionality includes:

* Create setlists
* Add songs
* Arrange song order
* Configure service dates
* Add descriptions/notes
* Configure service keys
* Open individual setlist details
* Launch Worship Mode

Setlist permissions are controlled according to the user's team role.

### 🎤 Worship Mode

Worship Mode provides a focused experience for using a setlist during a live worship service.

It supports:

* Setlist-based song navigation
* Service Key
* Live Transpose
* Current Key display
* Chords
* Lyrics
* Tabs
* Musician-focused song information

The chord engine allows the displayed music to be transposed without changing the original song data.

### 👥 Team Roles & Permissions

HIMIG uses role-based access control with four team roles:

| Role               | Access                                                  |
| ------------------ | ------------------------------------------------------- |
| **Owner/Admin**    | Full system access                                      |
| **Worship Leader** | Lyrics and shared setlist management                    |
| **Musician**       | Chords, tabs, Nashville Number Code and shared setlists |
| **Viewer**         | View-only access                                        |

Permissions are implemented in the application and supported by database security controls.

### ❤️ Personal Features

Users can maintain personal worship resources including:

* Favorites
* Recently viewed songs
* Personal notes
* Personal song preferences

These personal features are associated with the authenticated user.

### 📱 Mobile & PWA Experience

HIMIG includes a mobile-focused navigation experience designed for smartphones and tablets.

Mobile users can:

* Swipe from the left edge to open navigation
* Swipe left to close the navigation drawer
* Tap outside the drawer to close it
* Quickly access major sections of the application

The application also includes Progressive Web App support and HIMIG REST NOTE branding for a more app-like mobile experience.

### 🎨 REST NOTE Branding

HIMIG uses a custom **REST NOTE** visual identity featuring a clean dark interface with a blue/cyan accent.

The branding is used across the application and mobile/PWA experience.

---

# 🛠 Technology Stack

### Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS
* Next.js App Router

### Backend & Database

* Supabase
* PostgreSQL
* Supabase Authentication
* Row Level Security (RLS)

### Development

* ESLint
* TypeScript
* npm
* Git / GitHub

### Deployment

* Vercel
* Supabase

---

# 🏗 Application Architecture

HIMIG uses a modern Next.js App Router architecture.

```text
HIMIG
│
├── app/
│   ├── login/
│   ├── songs/
│   ├── setlists/
│   ├── favorites/
│   ├── team/
│   └── api/
│
├── components/
│   └── MobileNavDrawer.tsx
│
├── lib/
│   ├── auth.ts
│   ├── chords.ts
│   ├── permissions.ts
│   ├── profile.ts
│   ├── songs.ts
│   ├── song-import.ts
│   ├── supabase.ts
│   └── supabaseAdmin.ts
│
└── public/
    └── HIMIG PWA assets
```

The application separates UI, authentication, music-processing logic, permissions, and Supabase data access into dedicated modules.

---

# 🔐 Security & Access Control

HIMIG uses authenticated user accounts and database-level access controls to protect application data.

The system includes:

* Supabase Authentication
* User profiles
* Role-based application permissions
* PostgreSQL Row Level Security
* User-specific access for personal data
* Protected team and shared resources

The permission system is designed around the responsibilities of worship team members rather than providing every user with unrestricted editing access.

---

# 🎯 Project Purpose

HIMIG was created to address common challenges faced by worship teams when managing:

* Large song libraries
* Lyrics and chord information
* Service setlists
* Musical arrangements
* Key changes
* Worship-service preparation
* Team collaboration
* Mobile access during services

The goal is to provide worship teams with a single platform for organizing their musical resources before and during worship services.

---

# 👨‍💻 My Role

**Full-Stack Developer / Project Administrator**

Responsibilities included:

* Application architecture and development
* Next.js and TypeScript implementation
* React UI development
* Tailwind CSS styling
* Supabase integration
* Authentication implementation
* Database integration
* Role-based permission design
* RLS/security implementation
* Chord transposition engine
* Setlist and Worship Mode development
* Responsive mobile experience
* PWA configuration
* Deployment and production troubleshooting

---

# 🚀 Current Status

HIMIG is an actively developed application currently implemented for **KCCC Psalmist**.

The current version provides the foundation for future expansion, including the possibility of supporting additional worship teams and church organizations.

Future product development may include organization-based workspaces, church onboarding, organization-specific branding, and additional administrative capabilities.

---

# 🌐 Project

**Live Application:**
https://himig-worship-app.vercel.app/

**GitHub Repository:**
https://github.com/micahtraya/himig-worship-app

---

# 📌 Project Highlights

HIMIG demonstrates practical experience in:

**Full-Stack Web Development**
Next.js + React + TypeScript

**Cloud Database Development**
Supabase + PostgreSQL

**Application Security**
Authentication + Role-Based Access + RLS

**Music Technology**
Chord parsing + Key transposition + Nashville Number Code

**Product Development**
Real-world requirements → application design → implementation → deployment

**Mobile Development**
Responsive UI + PWA + touch/swipe navigation

---

## HIMIG

**Organize the songs. Prepare the service. Worship together.**
