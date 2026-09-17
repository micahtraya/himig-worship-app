# HIMIG Architecture



## Overview



HIMIG is a full-stack worship songbook and team collaboration application built for KCCC Psalmist.



The current architecture provides:



- Secure user authentication

- Role-based access control

- Shared worship song library

- Shared setlists

- Chord and key transposition

- Nashville Number Code

- Guitar tabs

- Worship Mode

- Personal favorites

- Recent songs

- Personal notes

- Personal song preferences

- Responsive mobile navigation

- Progressive Web App capabilities

- Supabase Row Level Security



The current implementation is designed around one organization, KCCC Psalmist.



Future multi-organization functionality is intentionally outside the scope of the current architecture and will be addressed in a later product phase.



## High-Level Architecture



&#x20;   User

&#x20;     |

&#x20;     v

&#x20;   Next.js Application

&#x20;     |

&#x20;     +----------------------+

&#x20;     |                      |

&#x20;     v                      v

&#x20;   Supabase Auth       Application Logic

&#x20;     |                      |

&#x20;     v                      v

&#x20;   User Profile        Permission Checks

&#x20;                            |

&#x20;                            v

&#x20;                      Supabase Database

&#x20;                            |

&#x20;             +--------------+--------------+

&#x20;             |              |              |

&#x20;             v              v              v

&#x20;          Profiles        Songs         Setlists

&#x20;                                            |

&#x20;                                            v

&#x20;                                     Setlist Songs

&#x20;             |

&#x20;             +----------------------------------+

&#x20;             |

&#x20;             v

&#x20;      Personal User Data

&#x20;      - Favorites

&#x20;      - Recent Songs

&#x20;      - Personal Notes

&#x20;      - Song Preferences



## Technology Architecture



### Frontend



- Next.js App Router

- React

- TypeScript

- Tailwind CSS

- Responsive layouts

- Client-side interactive components



### Backend and Data



- Supabase

- PostgreSQL

- Supabase Auth

- Row Level Security (RLS)

- Database functions

- Database triggers



### Development and Deployment



- Git

- GitHub

- Vercel

- Node.js

- npm



## Application Structure



The application uses the Next.js App Router.



Major application areas include:



&#x20;   app/

&#x20;     |

&#x20;     +-- Authentication

&#x20;     |

&#x20;     +-- Dashboard

&#x20;     |

&#x20;     +-- Songs

&#x20;     |

&#x20;     +-- Setlists

&#x20;     |

&#x20;     +-- Worship Mode

&#x20;     |

&#x20;     +-- Team Management

&#x20;     |

&#x20;     +-- Personal Features

&#x20;     |

&#x20;     +-- Mobile Navigation



Reusable application logic is separated into supporting libraries such as the chord and permission utilities.



## Authentication Architecture



Authentication is handled by Supabase Auth.



The general authentication flow is:



&#x20;   User

&#x20;     |

&#x20;     v

&#x20;   Login Page

&#x20;     |

&#x20;     v

&#x20;   Supabase Auth

&#x20;     |

&#x20;     v

&#x20;   Authenticated Session

&#x20;     |

&#x20;     v

&#x20;   User Profile

&#x20;     |

&#x20;     v

&#x20;   Application Role

&#x20;     |

&#x20;     v

&#x20;   Permission-Aware UI



Each authenticated user has a corresponding profile record.



The current profile fields are:



- id

- display_name

- role

- created_at

- updated_at



The application uses the authenticated user's profile to determine their role and available actions.



## Database Architecture



The current Supabase database contains the following major tables:



- profiles

- songs

- setlists

- setlist_songs

- favorites

- recent_songs

- personal_notes

- personal_song_preferences



The database is divided conceptually into shared team data and personal user data.



## Shared Team Data



Shared team data is available to authorized HIMIG members.



Current shared tables include:



- profiles

- songs

- setlists

- setlist_songs



Songs represent the team's shared worship song library.



Setlists represent shared worship services or song collections.



Setlist songs connect individual songs to a setlist and support the ordering of songs within a service.



## Personal User Data



Personal data belongs to the individual authenticated user.



Current personal tables include:



- favorites

- recent_songs

- personal_notes

- personal_song_preferences



Personal records are associated with the authenticated user's ID.



The security model ensures that personal data is isolated between users.



## Song Architecture



Songs are stored in the shared song library.



A song can contain information such as:



- Title

- Artist

- Key

- Language

- Category

- BPM

- Time signature

- Lyrics

- Chords

- Nashville Number Code

- Guitar tabs



The song architecture separates musical content into fields so that permissions can be applied to different types of content.



For example, lyrics permissions can be different from chord and tab permissions.



## Permission Architecture



HIMIG uses role-based permissions.



Current roles are:



### Owner/Admin



Full access to the application and team data.



### Worship Leader



Can edit song lyrics.



Worship Leaders cannot edit:



- Chords

- Guitar tabs

- Nashville Number Code



Worship Leaders can:



- Create setlists

- Edit shared setlists

- Delete shared setlists

- Manage setlist songs according to the application's setlist permissions



### Musician



Can edit:



- Chords

- Guitar tabs

- Nashville Number Code



Musicians cannot edit song lyrics.



Musicians can:



- Create setlists

- Edit shared setlists

- Add, remove, and reorder songs in setlists



Musicians cannot delete shared setlists.



### Viewer



Read-only access.



Viewers can view songs and setlists but cannot modify shared content.



## Authorization Architecture



Authorization is implemented at multiple levels.



### Frontend Permission Controls



The frontend uses role-aware permission logic to control which actions and fields are available to users.



For example:



- Restricted song fields are protected during editing.

- Setlist actions are shown according to the user's role.

- Read-only users do not receive editing controls.



### Supabase Security



Supabase Row Level Security provides database-level protection.



Important database security components include:



- get_my_role()

- is_owner_admin()

- Song update permission trigger

- Table-level RLS policies



The database remains the final security boundary even when frontend controls are bypassed.



## Chord and Key Transposition Architecture



The chord engine is implemented in:



&#x20;   lib/chords.ts



The chord system supports key-aware transposition.



It handles musical structures including:



- Major chords

- Minor chords

- Sharps

- Flats

- Chord extensions

- Slash chords

- Key normalization

- Note spelling preferences



The transposition engine allows the same song content to be displayed in different musical keys without permanently modifying the stored song.



## Setlist Architecture



Setlists provide a shared structure for worship services.



The relationship is:



&#x20;   Setlist

&#x20;      |

&#x20;      +-- Song 1

&#x20;      |

&#x20;      +-- Song 2

&#x20;      |

&#x20;      +-- Song 3

&#x20;      |

&#x20;      +-- Song 4



The setlist_songs table connects songs to setlists.



This allows songs to remain part of the shared song library while being reused across multiple setlists.



Song content is not duplicated when a song is added to a setlist.



## Worship Mode Architecture



Worship Mode is designed for live service use.



The general flow is:



&#x20;   Setlist

&#x20;      |

&#x20;      v

&#x20;   Selected Song

&#x20;      |

&#x20;      v

&#x20;   Original Key

&#x20;      |

&#x20;      v

&#x20;   Service Key

&#x20;      |

&#x20;      v

&#x20;   Current Key

&#x20;      |

&#x20;      v

&#x20;   Live Worship Display



Worship Mode can display musical content such as:



- Lyrics

- Chords

- Nashville Number Code

- Guitar tabs



The key and transpose controls allow musicians to adjust the displayed key during a worship service.



The stored song remains unchanged.



## Mobile and PWA Architecture



HIMIG uses responsive web layouts rather than a separate native mobile application.



The mobile experience includes:



- Responsive dashboard

- Mobile navigation

- Navigation drawer

- Touch-friendly controls

- Swipe gestures

- Responsive song views

- Responsive setlists

- Worship Mode optimized for smaller screens



The application also includes Progressive Web App functionality.



The PWA architecture includes:



- Web app manifest

- HIMIG application icons

- Installable application experience

- Mobile-friendly viewport configuration



The current branding uses the HIMIG REST NOTE visual identity.



## Data Flow



A typical shared song workflow is:



&#x20;   User

&#x20;     |

&#x20;     v

&#x20;   Supabase Auth

&#x20;     |

&#x20;     v

&#x20;   User Profile / Role

&#x20;     |

&#x20;     v

&#x20;   Permission Check

&#x20;     |

&#x20;     v

&#x20;   Song Library

&#x20;     |

&#x20;     v

&#x20;   Supabase PostgreSQL

&#x20;     |

&#x20;     v

&#x20;   RLS / Database Security

&#x20;     |

&#x20;     v

&#x20;   Authorized Result



A typical personal-data workflow is:



&#x20;   Authenticated User

&#x20;         |

&#x20;         v

&#x20;   User ID (auth.uid())

&#x20;         |

&#x20;         v

&#x20;   Personal Table

&#x20;         |

&#x20;         v

&#x20;   RLS checks user ownership

&#x20;         |

&#x20;         v

&#x20;   Personal Data



## Security Boundary



The HIMIG security model uses defense in depth.



&#x20;   Frontend Permissions

&#x20;          |

&#x20;          v

&#x20;   Application Authorization

&#x20;          |

&#x20;          v

&#x20;   Supabase Authentication

&#x20;          |

&#x20;          v

&#x20;   PostgreSQL Row Level Security

&#x20;          |

&#x20;          v

&#x20;   Database Functions / Triggers

&#x20;          |

&#x20;          v

&#x20;   Protected Data



Frontend permissions improve the user experience by hiding or disabling unauthorized actions.



Database security protects the actual data even if a user attempts to bypass the frontend.



## Current Architecture Boundaries



The current architecture intentionally supports the existing KCCC Psalmist implementation.



The following capabilities are not part of the current database architecture:



- Multiple organizations

- Organization membership tables

- Organization-specific RLS

- Church onboarding

- Organization-specific branding

- Organization-specific settings

- Subscription management

- Commercial account management



These are planned for later product phases.



The current implementation should not be modified simply to anticipate those future capabilities.



## Architecture Summary



HIMIG is structured as a Next.js full-stack application connected to Supabase.



The architecture separates:



- Authentication

- User profiles

- Shared team content

- Personal user data

- Role-based authorization

- Musical processing

- Setlist management

- Worship Mode

- Mobile/PWA functionality

- Database security



The current design provides a secure foundation for the KCCC Psalmist worship team while keeping the codebase suitable for future product expansion.



Future multi-organization architecture will be introduced as a separate product-design and database-architecture phase rather than being mixed into the current implementation.



