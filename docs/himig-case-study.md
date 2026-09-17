# HIMIG — Technical Case Study



## Project Overview



HIMIG is a worship songbook and service-management web application built for the KCCC Psalmist worship team.



The application provides a shared digital workspace for worship-team members to:



- Manage a shared song library

- Store lyrics, chords, tabs, and Nashville Number Code

- Organize songs into shared setlists

- Prepare songs for worship services

- Transpose chords and song keys

- Use Worship Mode during live services

- Manage favorites and recently used songs

- Keep personal notes and song preferences

- Manage team members and role-based permissions

- Access the application from desktop and mobile devices



HIMIG combines a modern responsive frontend with Supabase authentication, PostgreSQL data storage, Row Level Security, and database-level authorization.



The project began as a KCCC Psalmist-specific application and is being structured so the underlying architecture can eventually support multiple worship teams or organizations.



---



# Project Context



## The Original Problem



A worship team needs fast and reliable access to musical information during preparation and live services.



Traditional approaches can involve:



- Separate lyric documents

- Chord sheets stored in different locations

- Printed song lists

- Manually maintained setlists

- Different versions of songs

- Limited access to updated arrangements

- Difficulty coordinating information between worship leaders and musicians



HIMIG addresses these problems by bringing the team's shared song and service information into a single application.



---



# Project Goals



The main goals of HIMIG were to create a system that could:



1. Centralize the team's song library.

2. Make songs accessible from multiple devices.

3. Support lyrics, chords, tabs, and Nashville Number Code.

4. Provide role-specific editing permissions.

5. Allow teams to build and manage setlists.

6. Provide a focused Worship Mode for live service use.

7. Support musical key and chord transposition.

8. Separate shared team data from private personal data.

9. Protect data using Supabase authentication and Row Level Security.

10. Provide a mobile-app-like experience without maintaining separate native applications.



---



# My Role



I designed and developed the HIMIG application and its supporting architecture.



My work includes:



- Application architecture

- Frontend development

- Next.js implementation

- TypeScript development

- Responsive UI implementation

- Mobile navigation

- PWA implementation

- Supabase integration

- Authentication

- Profile and role management

- Database integration

- Row Level Security design

- Permission architecture

- Song management

- Setlist management

- Worship Mode

- Chord transposition

- Personal data features

- Deployment and GitHub workflow

- Technical documentation



The project required both application development and backend authorization design because the system manages shared team data with different permission levels.



---



# Technology Stack



## Frontend



- Next.js

- React

- TypeScript

- Tailwind CSS



## Backend and Database



- Supabase

- PostgreSQL

- Supabase Auth

- Row Level Security



## Development and Deployment



- Git

- GitHub

- Vercel

- Node.js

- npm



---



# High-Level Architecture



```text

&#x20;                   HIMIG

&#x20;                     |

&#x20;       +-------------+-------------+

&#x20;       |                           |

&#x20;       v                           v

&#x20;  Next.js Frontend            Supabase

&#x20;       |                           |

&#x20;       |                    +------+------+

&#x20;       |                    |             |

&#x20;       v                    v             v

&#x20;Responsive UI          Supabase Auth   PostgreSQL

&#x20;       |                                  |

&#x20;       |                                  v

&#x20;       |                               RLS

&#x20;       |                                  |

&#x20;       +-------------------------------> Data


