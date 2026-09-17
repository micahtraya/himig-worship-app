# HIMIG Role Permissions



## Overview



HIMIG uses role-based access control to manage what each team member can view and modify.



The current implementation is designed for the KCCC Psalmist team and uses four roles:



- Owner/Admin

- Worship Leader

- Musician

- Viewer



Permissions are enforced through both the application interface and the Supabase database security layer.



This document describes the current permission model implemented in HIMIG.



---



## Role Model



HIMIG separates team responsibilities by role.



Each role has a defined scope of access to shared songs, setlists, and personal user data.



The four roles are:



| Role | General Access |

|---|---|

| Owner/Admin | Full access |

| Worship Leader | Lyrics + shared setlist management |

| Musician | Chords, tabs, Nashville Number Code + shared setlist editing |

| Viewer | Read-only access |



The permissions below are the authoritative role definitions for the current HIMIG implementation.



---



# Owner/Admin



Owner/Admin has full access to the HIMIG team workspace.



### Songs



Owner/Admin can:



- View songs

- Create songs

- Edit songs

- Delete songs

- Edit lyrics

- Edit chords

- Edit tabs

- Edit Nashville Number Code

- Edit song metadata



### Setlists



Owner/Admin can:



- View shared setlists

- Create setlists

- Edit setlists

- Delete setlists

- Add songs to setlists

- Remove songs from setlists

- Reorder songs in setlists



### Personal Data



Owner/Admin can access their own personal data according to the normal user ownership rules.



This includes:



- Favorites

- Recent songs

- Personal notes

- Personal song preferences



Owner/Admin does not automatically gain access to another user's private personal data simply because they have the Owner/Admin role.



---



# Worship Leader



Worship Leader has access focused on lyrics and worship-service setlist management.



### Songs



Worship Leader can:



- View songs

- Edit song lyrics



Worship Leader cannot edit:



- Chords

- Tabs

- Nashville Number Code



The restricted song fields remain protected when a Worship Leader saves a song.



### Setlists



Worship Leader can:



- View shared setlists

- Create setlists

- Edit shared setlists

- Delete shared setlists

- Add songs to setlists

- Remove songs from setlists

- Reorder songs in setlists



This allows Worship Leaders to prepare and manage worship services while keeping musician-specific song fields under the appropriate role.



### Personal Data



Worship Leader can access their own:



- Favorites

- Recent songs

- Personal notes

- Personal song preferences



These personal records remain associated with the authenticated user.



---



# Musician



Musician access is focused on musical performance information.



### Songs



Musician can:



- View songs

- Edit chords

- Edit tabs

- Edit Nashville Number Code



Musician cannot edit:



- Lyrics



When a Musician saves a song, the lyrics remain protected.



### Setlists



Musician can:



- View shared setlists

- Create setlists

- Edit shared setlists

- Add songs to setlists

- Remove songs from setlists

- Reorder songs in setlists



Musician cannot:



- Delete shared setlists



### Personal Data



Musician can access their own:



- Favorites

- Recent songs

- Personal notes

- Personal song preferences



These records remain private to the authenticated user.



---



# Viewer



Viewer has read-only access.



### Songs



Viewer can:



- View songs

- View lyrics

- View chords

- View tabs

- View Nashville Number Code

- View song metadata



Viewer cannot:



- Create songs

- Edit songs

- Delete songs



### Setlists



Viewer can:



- View shared setlists

- View songs contained in setlists



Viewer cannot:



- Create setlists

- Edit setlists

- Delete setlists

- Add songs to setlists

- Remove songs from setlists

- Reorder songs in setlists



### Personal Data



Viewer can use their own personal data features according to the application's user ownership rules.



Personal data remains associated with the authenticated user and is not shared simply because the user has Viewer access to team data.



---



# Permission Matrix



The following matrix summarizes the current shared-data permissions.



## Song Permissions



| Action | Owner/Admin | Worship Leader | Musician | Viewer |

|---|:---:|:---:|:---:|:---:|

| View songs | Yes | Yes | Yes | Yes |

| Create songs | Yes | No | No | No |

| Edit lyrics | Yes | Yes | No | No |

| Edit chords | Yes | No | Yes | No |

| Edit tabs | Yes | No | Yes | No |

| Edit Nashville Number Code | Yes | No | Yes | No |

| Edit song metadata | Yes | No | No | No |

| Delete songs | Yes | No | No | No |



The application may display editable controls selectively based on the user's role, while the database security layer provides additional protection.



---



# Setlist Permissions



| Action | Owner/Admin | Worship Leader | Musician | Viewer |

|---|:---:|:---:|:---:|:---:|

| View setlists | Yes | Yes | Yes | Yes |

| Create setlists | Yes | Yes | Yes | No |

| Edit setlists | Yes | Yes | Yes | No |

| Delete setlists | Yes | Yes | No | No |

| Add songs | Yes | Yes | Yes | No |

| Remove songs | Yes | Yes | Yes | No |

| Reorder songs | Yes | Yes | Yes | No |



---



# Setlist Song Permissions



`setlist_songs` represents the songs associated with a shared setlist.



The current permission model allows the following roles to manage the contents of shared setlists:



- Owner/Admin

- Worship Leader

- Musician



Viewer has read-only access.



| Action | Owner/Admin | Worship Leader | Musician | Viewer |

|---|:---:|:---:|:---:|:---:|

| View setlist songs | Yes | Yes | Yes | Yes |

| Add song | Yes | Yes | Yes | No |

| Remove song | Yes | Yes | Yes | No |

| Reorder songs | Yes | Yes | Yes | No |



Setlist deletion is controlled separately through the `setlists` permissions.



---



# Personal Data Permissions



HIMIG also contains data that belongs to individual authenticated users.



Personal data includes:



- Favorites

- Recent songs

- Personal notes

- Personal song preferences



These records are associated with the authenticated user's identity.



The role model does not make another user's personal records automatically visible.



## Personal Data Principle



A team role determines access to shared team resources.



It does not automatically grant access to another user's private personal data.



For example:



- An Owner/Admin can manage shared songs and setlists.

- An Owner/Admin does not automatically see another user's private notes.

- A Worship Leader's personal favorites remain associated with that user.

- A Musician's personal song preferences remain associated with that user.



---



# Frontend Permission Controls



HIMIG uses frontend permission logic to control the user interface.



Depending on the authenticated user's role, the application can:



- Show or hide editing controls

- Disable restricted fields

- Hide destructive actions

- Prevent unauthorized navigation

- Preserve protected song fields during updates



Frontend permission controls improve usability by showing users the actions that apply to their role.



However, frontend controls are not considered the primary security boundary.



---



# Database Permission Controls



Supabase provides the database-level authorization boundary.



Row Level Security and database-side authorization rules protect shared data even if a user attempts to bypass the frontend.



This creates two complementary layers:



```text

User

&#x20; |

&#x20; v

HIMIG Frontend

&#x20; |

&#x20; |-- Role-based UI controls

&#x20; |

&#x20; v

Supabase

&#x20; |

&#x20; |-- Authentication

&#x20; |-- Row Level Security

&#x20; |-- Database functions

&#x20; |-- Database triggers

&#x20; |

&#x20; v

PostgreSQL Data


