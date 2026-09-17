# HIMIG Security and RLS



## Overview



HIMIG uses a layered security model that combines application-level authorization with Supabase authentication and PostgreSQL Row Level Security (RLS).



The goal is to ensure that:



- Users are authenticated before accessing protected application features.

- User roles determine which actions are available.

- Shared team data is protected according to role permissions.

- Personal user data is isolated between users.

- Database-level security remains effective even if frontend controls are bypassed.



The current implementation is designed for KCCC Psalmist.



Future multi-organization security is outside the scope of this document and will be introduced in a later product phase.



## Security Architecture



The current security model can be viewed as several layers:



&#x20;   User

&#x20;     |

&#x20;     v

&#x20;   Supabase Authentication

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

&#x20;   Frontend Permission Checks

&#x20;     |

&#x20;     v

&#x20;   Supabase RLS

&#x20;     |

&#x20;     v

&#x20;   PostgreSQL

&#x20;     |

&#x20;     v

&#x20;   Protected Data



The frontend improves the user experience by controlling available actions.



Supabase and PostgreSQL provide the actual database security boundary.



## Authentication



HIMIG uses Supabase Auth for user authentication.



Users authenticate through the HIMIG login flow and receive a Supabase authenticated session.



Authenticated requests are associated with the user's authenticated ID.



The application uses this identity to:



- Identify the current user.

- Load the user's profile.

- Determine the user's role.

- Apply personal-data ownership rules.

- Apply role-based access controls.



Unauthenticated users should not have access to protected team functionality.



## Profiles



The `profiles` table stores the application profile associated with an authenticated user.



Current profile fields include:



- `id`

- `display_name`

- `role`

- `created_at`

- `updated_at`



The profile ID corresponds to the authenticated user's ID.



The role stored in the profile is used by the application and database authorization logic.



## Role Model



HIMIG currently uses four roles:



- Owner/Admin

- Worship Leader

- Musician

- Viewer



These roles are intentionally limited to the permissions required by the current KCCC Psalmist implementation.



## Owner/Admin



Owner/Admin has full access to HIMIG team functionality.



This includes:



- Managing shared songs

- Editing song content

- Managing setlists

- Adding and removing songs from setlists

- Reordering setlist songs

- Managing team-related functionality

- Accessing protected team data



Owner/Admin is the highest permission level in the current role model.



## Worship Leader



Worship Leaders have permission to edit song lyrics.



They cannot edit:



- Chords

- Guitar tabs

- Nashville Number Code



Worship Leaders can also manage shared setlists.



Their setlist permissions include:



- Create setlists

- View setlists

- Edit setlists

- Delete shared setlists

- Manage songs within setlists according to the setlist permissions



## Musician



Musicians can edit the musical arrangement information intended for musicians.



They can edit:



- Chords

- Guitar tabs

- Nashville Number Code



They cannot edit song lyrics.



Musicians can also:



- Create setlists

- View setlists

- Edit shared setlists

- Add songs to setlists

- Remove songs from setlists

- Reorder songs in setlists



Musicians cannot delete shared setlists.



## Viewer



Viewers have read-only access.



Viewers can view:



- Songs

- Setlists

- Available worship content



Viewers cannot modify shared content.



They cannot:



- Edit songs

- Edit lyrics

- Edit chords

- Edit tabs

- Edit Nashville Number Code

- Edit shared setlists

- Delete shared setlists

- Modify personal data belonging to another user



## Permission Summary



The current role model can be summarized as follows.



&#x20;   Owner/Admin

&#x20;       Full access



&#x20;   Worship Leader

&#x20;       Lyrics editing

&#x20;       Setlist create/edit/delete

&#x20;       Setlist song management



&#x20;   Musician

&#x20;       Chords editing

&#x20;       Tabs editing

&#x20;       Nashville Number Code editing

&#x20;       Setlist create/edit

&#x20;       Setlist song management



&#x20;   Viewer

&#x20;       Read-only shared content



The role model separates worship-content responsibilities from musician arrangement responsibilities.



## Frontend Authorization



HIMIG uses frontend permission checks to control the user interface.



Frontend authorization is responsible for determining whether controls and editing capabilities should be presented to the current user.



Examples include:



- Showing song-edit controls only to authorized users.

- Restricting editable song fields by role.

- Preventing unauthorized role-based actions from being exposed in the interface.

- Showing or hiding setlist management actions according to role.



Frontend authorization is primarily a user-experience layer.



It should never be considered the only security mechanism.



## Database Authorization



The database provides the final security boundary.



Supabase Row Level Security policies determine whether database operations are permitted.



This protects against attempts to bypass the application's frontend.



The security model therefore follows:



&#x20;   Frontend Permission Check

&#x20;            |

&#x20;            v

&#x20;   Application Authorization

&#x20;            |

&#x20;            v

&#x20;   Database RLS

&#x20;            |

&#x20;            v

&#x20;   PostgreSQL Data



A request must satisfy the applicable database security rules before protected data can be changed.



## Row Level Security



Supabase PostgreSQL Row Level Security is used to protect HIMIG tables.



RLS policies are designed around:



- Authenticated user identity

- User ownership

- Application role

- Shared team access

- Operation type



Database operations can be separately controlled for:



- SELECT

- INSERT

- UPDATE

- DELETE



This allows the security model to distinguish between viewing data and modifying data.



## Role Resolution



HIMIG uses database functions to support role-aware authorization.



### get_my_role()



`get_my_role()` returns the role associated with the currently authenticated user.



The function uses the authenticated user's identity to locate the corresponding profile.



This allows database authorization logic to reference the current user's role without requiring the frontend to supply the role as a trusted value.



### is_owner_admin()



`is_owner_admin()` provides a reusable database-level check for Owner/Admin authorization.



It allows policies and database logic to determine whether the current authenticated user has the highest permission level.



## Song Security



Songs are shared team data.



Song security must protect both the overall song record and role-specific editable fields.



The current permission model separates musical content into areas such as:



- Lyrics

- Chords

- Tabs

- Nashville Number Code



The application uses role-aware editing logic so that users do not unintentionally overwrite fields outside their permitted area.



Database-level protection also supports the song authorization model.



## Song Update Protection



HIMIG uses a database trigger named:



`check_song_update_permissions`



The trigger provides an additional database-level authorization layer for song updates.



Its purpose is to prevent unauthorized role-based modification of protected song content.



This is important because frontend restrictions alone could potentially be bypassed by a direct database request.



The trigger therefore complements the frontend permission logic and RLS policies.



## Setlist Security



Setlists are shared team data.



The current intended permissions are:



&#x20;   Owner/Admin

&#x20;       Create

&#x20;       View

&#x20;       Edit

&#x20;       Delete



&#x20;   Worship Leader

&#x20;       Create

&#x20;       View

&#x20;       Edit

&#x20;       Delete



&#x20;   Musician

&#x20;       Create

&#x20;       View

&#x20;       Edit



&#x20;   Viewer

&#x20;       View only



The `setlist_songs` table supports the relationship between setlists and songs.



Authorized team members can add, remove, and reorder songs within a setlist according to their role.



Viewers remain read-only.



## Personal Data Security



HIMIG contains several personal user-data tables:



- `favorites`

- `recent_songs`

- `personal_notes`

- `personal_song_preferences`



These records are associated with the authenticated user's ID.



The intended ownership rule is:



&#x20;   auth.uid()

&#x20;       |

&#x20;       v

&#x20;   Personal record.user_id



A user can access their own personal records but should not be able to access another user's personal records.



This provides user-level data isolation even though multiple team members use the same HIMIG application.



## Personal Favorites



Favorites are personal to each user.



A user's favorite songs should not become shared team data.



The database ownership rule is based on the authenticated user's ID.



## Recent Songs



Recent song history is personal to each user.



One team member's recent-song activity should not become another team member's recent-song activity.



The `recent_songs` table therefore follows the authenticated user's ownership boundary.



## Personal Notes



Personal notes are private user data.



Notes associated with one authenticated user should not be visible or editable by another user.



The `personal_notes` table uses the authenticated user's ID as the ownership boundary.



## Personal Song Preferences



Personal song preferences allow users to store their own song-related settings.



These preferences remain associated with the individual user rather than becoming shared song-library settings.



The `personal_song_preferences` table therefore follows the same user-ownership model.



## Shared Data vs Personal Data



The current security boundary can be summarized as:



&#x20;   SHARED TEAM DATA

&#x20;   ----------------

&#x20;   profiles

&#x20;   songs

&#x20;   setlists

&#x20;   setlist_songs



&#x20;   PERSONAL USER DATA

&#x20;   ------------------

&#x20;   favorites

&#x20;   recent_songs

&#x20;   personal_notes

&#x20;   personal_song_preferences



Shared data is controlled by team roles.



Personal data is controlled by authenticated user ownership.



## Defense in Depth



HIMIG does not rely on a single authorization mechanism.



The security model uses multiple layers:



1. Supabase authentication

2. User profile and role resolution

3. Frontend permission controls

4. Supabase Row Level Security

5. Database functions

6. Database triggers



This provides defense in depth.



If a frontend restriction is bypassed, the database authorization layer remains responsible for protecting the data.



## Security Principles



The current HIMIG security implementation follows several principles.



### Authenticate First



Protected functionality requires an authenticated user.



### Least Privilege



Users receive only the permissions required by their role.



### Separate Shared and Personal Data



Shared team content and personal user information use different access models.



### Do Not Trust the Frontend



Frontend permission checks are not treated as the final security boundary.



### Enforce Sensitive Rules in the Database



RLS, database functions, and triggers provide server-side enforcement.



### Preserve Existing Permissions



Security changes should not silently expand or reduce role permissions without an explicit product decision.



## Current Security Boundaries



The current implementation is designed for one organization:



KCCC Psalmist.



The following security capabilities are intentionally outside the current implementation:



- Organization-level membership isolation

- Multiple organizations

- Organization-specific RLS

- Organization administrators

- Church onboarding

- Organization-specific security settings

- Subscription-level access control



These capabilities belong to the future multi-organization architecture.



## Future Security Direction



When HIMIG evolves into a multi-organization platform, the security model can be extended to include organization membership.



A future architecture may follow:



&#x20;   User

&#x20;     |

&#x20;     v

&#x20;   Organization Membership

&#x20;     |

&#x20;     v

&#x20;   Organization Role

&#x20;     |

&#x20;     v

&#x20;   Organization Data

&#x20;     |

&#x20;     v

&#x20;   Organization RLS



Future organization-aware RLS would ensure that users can access only the data belonging to organizations in which they are members.



This future architecture is not part of the current KCCC Psalmist implementation.



## Security Summary



HIMIG uses Supabase Auth, PostgreSQL Row Level Security, role-aware application authorization, database functions, and database triggers to protect the application.



The current security model separates:



- Authentication

- Role authorization

- Shared team data

- Personal user data

- Database enforcement



The four current roles provide clearly defined access levels:



- Owner/Admin — full access

- Worship Leader — lyrics and setlist management

- Musician — chords, tabs, Nashville Number Code, and setlist management

- Viewer — read-only



The architecture provides a security foundation for the current KCCC Psalmist implementation while leaving room for future organization-level isolation.



