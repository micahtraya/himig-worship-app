# HIMIG — Technical Portfolio Presentation



## Project Overview



HIMIG is a modern worship songbook and worship-team management platform built for KCCC Psalmist.



The application provides a centralized digital workspace for managing worship songs, chords, tabs, setlists, team roles, personal song preferences, and live Worship Mode.



HIMIG was designed as a real working application rather than a simple demo project. The system combines modern web development, authentication, role-based access control, database security, responsive design, and music-specific functionality into one platform.



---



# 1. The Problem



Worship teams often rely on a combination of:



- Printed songbooks

- Personal notes

- Shared documents

- Messaging applications

- Spreadsheet-based setlists

- Separate chord resources

- Manually maintained song arrangements



This can make it difficult to maintain a single reliable source of truth for worship songs and services.



Different team members also need different levels of access.



For example:



- Worship Leaders need access to lyrics.

- Musicians need access to chords, tabs, and Nashville Number Code.

- Team administrators need broader management capabilities.

- Viewers may only need read access.



HIMIG was created to bring these workflows into one controlled application.



---



# 2. The Solution



HIMIG provides a centralized worship-team platform with:



- Shared song library

- Song lyrics and arrangements

- Chords

- Tabs

- Nashville Number Code

- Key management

- Chord transposition

- Shared setlists

- Worship Mode

- Favorites

- Recently viewed songs

- Personal notes

- Personal song preferences

- Team accounts

- Role-based permissions

- Supabase authentication

- PostgreSQL database

- Row Level Security

- Responsive mobile navigation

- Progressive Web App support



The result is a single application that supports both preparation and live worship use.



---



# 3. My Role



I designed, developed, tested, documented, and deployed the HIMIG platform.



My work included:



- Application architecture

- Frontend development

- Next.js development

- TypeScript development

- Tailwind CSS

- Supabase integration

- Authentication

- User profiles

- Role-based access control

- Database security

- Row Level Security

- Song management

- Chord processing

- Key transposition

- Setlist management

- Worship Mode

- Personal user data

- Responsive mobile UX

- PWA configuration

- Deployment

- Git/GitHub workflow

- Technical documentation



The project required both application development and systems thinking because the application needed to coordinate frontend permissions, authentication, database authorization, and user workflows.



---



# 4. Technology Stack



## Frontend



- Next.js

- React

- TypeScript

- Tailwind CSS



## Backend / Database



- Supabase

- PostgreSQL

- Supabase Auth

- Row Level Security



## Development



- Git

- GitHub

- PowerShell

- npm

- TypeScript tooling



## Deployment



- Vercel



## Application Architecture



- Next.js App Router

- Server/client component architecture

- Supabase-backed shared data

- User-specific personal data

- Database-enforced authorization



---



# 5. High-Level Architecture



HIMIG follows a layered architecture.



```text

User

&#x20;│

&#x20;▼

Next.js Application

&#x20;│

&#x20;├── Authentication

&#x20;│

&#x20;├── Dashboard

&#x20;│

&#x20;├── Song Library

&#x20;│

&#x20;├── Song Editor

&#x20;│

&#x20;├── Setlists

&#x20;│

&#x20;├── Worship Mode

&#x20;│

&#x20;└── Personal Features

&#x20;│

&#x20;▼

Supabase

&#x20;│

&#x20;├── Supabase Auth

&#x20;│

&#x20;├── PostgreSQL

&#x20;│

&#x20;├── Profiles

&#x20;│

&#x20;├── Shared Songs

&#x20;│

&#x20;├── Shared Setlists

&#x20;│

&#x20;└── Personal User Data

&#x20;│

&#x20;▼

Row Level Security


