# HIMIG — Worship Songbook & Team Management Platform

**HIMIG** is a full-stack worship songbook and team management platform designed to help worship teams organize songs, manage setlists, prepare for services, and access musical resources from desktop and mobile devices.

Built for **KCCC Psalmist**, HIMIG combines a modern web application experience with Supabase authentication, database storage, role-based permissions, worship-service tools, and a mobile-friendly PWA experience.

> **HIMIG — Praise and Worship Songbook**

---

## ✨ Features

### 🔐 Login / Authentication

<img width="648" height="616" alt="HIMIG Login and Authentication" src="https://github.com/user-attachments/assets/28f69148-3a06-4962-94ae-09d53b538ec7" />

Secure team authentication using Supabase Auth.

---

### 🏠 Dashboard

<img width="1746" height="882" alt="HIMIG Dashboard" src="https://github.com/user-attachments/assets/0324cd31-31f0-406c-91ca-986499b2e051" />

The dashboard provides a central overview of the worship team's songs, favorites, setlists, and team workspace.

---

### 🎵 Song Library

<img width="1766" height="885" alt="HIMIG Song Library" src="https://github.com/user-attachments/assets/846c49c0-d203-4abb-9ec6-d1d2207c0d3a" />

HIMIG provides a shared worship song library containing:

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

Additional functionality includes:

* Song search and browsing
* Individual song pages
* Add and edit songs according to team permissions

---

### 🎼 Chord & Key Transposition

<img width="1088" height="824" alt="HIMIG Chord and Key Transposition" src="https://github.com/user-attachments/assets/90cfa3f5-abd1-4512-bf6b-8fc0df519c60" />

HIMIG includes a dedicated chord engine supporting:

* Key-aware chord transposition
* Sharp and flat notation
* Major and minor chords
* Chord qualities and extensions
* Slash chords
* Key normalization
* Musical note spelling preferences

This allows musicians to adapt songs to the required service key without modifying the original song data.

---

### 📋 Setlists

<img width="1053" height="372" alt="HIMIG Setlists" src="https://github.com/user-attachments/assets/90e47c77-6bb5-40da-97c6-2177c4b4d269" />

Teams can create and manage shared worship setlists.

Setlist functionality includes:

* Create setlists
* Add songs
* Arrange song order
* Configure service dates
* Add descriptions and notes
* Configure service keys
* Open individual setlist details
* Launch Worship Mode

Setlist access is controlled according to the user's team role.

---

### 🎤 Worship Mode

<img width="1066" height="885" alt="HIMIG Worship Mode" src="https://github.com/user-attachments/assets/007169e5-78ec-45a4-91e0-c60b75c4d98b" />

Worship Mode provides a focused interface for using a setlist during a live worship service.

It supports:

* Setlist-based song navigation
* Service Key
* Live Transpose
* Current Key display
* Chords
* Lyrics
* Tabs
* Musician-focused song information

The transposition engine changes the displayed musical content without changing the original song data.

---

### 👥 Team Roles & Permissions

<img width="648" height="758" alt="HIMIG Team Roles" src="https://github.com/user-attachments/assets/f0e758fe-d421-45d0-b49d-d1a046e665ae" />

<img width="838" height="870" alt="HIMIG Permission Controls" src="https://github.com/user-attachments/assets/25473270-c7df-4a36-a914-69a1d08050b3" />

HIMIG uses role-based access control with four team roles:

| Role               | Access                                                  |
| ------------------ | ------------------------------------------------------- |
| **Owner/Admin**    | Full system access                                      |
| **Worship Leader** | Lyrics and shared setlist management                    |
| **Musician**       | Chords, tabs, Nashville Number Code and shared setlists |
| **Viewer**         | View-only access                                        |

Application-level permissions are reinforced by database security controls.

See the detailed [Role Permissions](docs/role-permissions.md) documentation for the complete permission model.

---

### ❤️ Personal Features

Users can maintain personal worship resources including:

**Favorites**

<img width="857" height="290" alt="HIMIG Favorites" src="https://github.com/user-attachments/assets/82d538bd-3266-443d-b9fd-570fb43e7e1c" />

**Personal Notes**

<img width="750" height="316" alt="HIMIG Personal Notes" src="https://github.com/user-attachments/assets/0839e75a-b314-47d0-a17d-074271e1fda1" />

**Personal Song Preferences**

<img width="798" height="763" alt="HIMIG Personal Song Preferences" src="https://github.com/user-attachments/assets/fa5b69c7-0144-414c-8e5a-80fb950606fe" />

These personal features are associated with the authenticated user and are separate from shared team resources.

---

### 📱 Mobile & PWA Experience

<img width="971" height="2048" alt="HIMIG Mobile Navigation" src="https://github.com/user-attachments/assets/d87d9119-beab-48b9-b690-b934c16bb8fd" />

HIMIG provides a responsive mobile experience designed for smartphones and tablets.

Mobile navigation supports:

* Swipe from the left edge to open navigation
* Swipe left to close the navigation drawer
* Tap outside the drawer to close it
* Quick access to major application sections

The application also includes Progressive Web App support and REST NOTE branding for an app-like mobile experience.

---

### 🎨 REST NOTE Branding

HIMIG uses a custom **REST NOTE** visual identity featuring a clean dark interface with a blue/cyan accent.

The branding extends across the web application and mobile/PWA experience.

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

# 🏗 High-Level Architecture

```text
                         HIMIG Users
                              │
                              ▼
                  ┌──────────────────────┐
                  │      Next.js App     │
                  │ App Router / React / │
                  │ TypeScript / Tailwind│
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       Supabase Auth    Application      Mobile / PWA
       User Sessions       Logic          Experience
              │              │
              │       ┌──────┼──────┐
              │       │      │      │
              │      Songs Setlists Worship
              │                    Mode
              │
              └──────────────┬──────────────┘
                             ▼
                  ┌──────────────────────┐
                  │       Supabase       │
                  │                      │
                  │ PostgreSQL Database  │
                  │ Row Level Security   │
                  │ Database Functions   │
                  │ Permission Triggers  │
                  └──────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │        Vercel        │
                  │ Production Hosting   │
                  └──────────────────────┘
```

For the detailed technical architecture, see [Architecture Documentation](docs/architecture.md).

---

# 🔐 Security

HIMIG uses multiple layers of application and database security:

* Supabase Authentication
* User profiles and roles
* Role-based application permissions
* PostgreSQL Row Level Security
* User-specific access controls for personal data
* Database functions
* Database-level permission enforcement

The frontend provides the appropriate user experience for each role, while Supabase/PostgreSQL provides the database security boundary.

See [Security & RLS](docs/security-and-rls.md) for the detailed security architecture.

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

The goal is to provide worship teams with a single platform for organizing musical resources before and during worship services.

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

Future development may include organization-based workspaces, church onboarding, organization-specific branding, and additional administrative capabilities.

---

# 📚 Documentation

* [Architecture](docs/architecture.md)
* [Security & RLS](docs/security-and-rls.md)
* [Role Permissions](docs/role-permissions.md)
* [Mobile & PWA](docs/mobile-pwa.md)
* HIMIG Case Study *(coming next)*
* Portfolio Presentation *(coming later)*

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
