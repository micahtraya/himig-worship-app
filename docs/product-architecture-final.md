# HIMIG Product Architecture - Final



## Phase B4 - Product Architecture Finalization



This document finalizes the planned product architecture for HIMIG as a reusable worship songbook platform.



Phase B4 is documentation and architecture planning only.



No production database changes, frontend changes, authentication changes, RLS changes, or data migrations are performed in this phase.



---



## 1. Purpose



HIMIG is being developed as a reusable worship songbook platform rather than a system permanently tied to one church or worship organization.



The current production implementation serves KCCC Psalmist.



The future architecture separates:



\- HIMIG as the platform

\- A church or worship organization as an organization within HIMIG

\- Users as members of organizations

\- Shared organization data

\- Personal user data

\- Organization-level authorization and isolation



This separation allows the current KCCC implementation to remain functional while providing a clear path toward a future multi-organization product.



---



## 2. Platform Boundary



HIMIG is the application platform.



HIMIG provides the reusable technical capabilities required by worship teams.



These capabilities include:



\- Authentication

\- User profiles

\- Organization membership

\- Roles and permissions

\- Shared song libraries

\- Song editing

\- Chord management

\- Key management

\- Chord transposition

\- Setlists

\- Setlist songs

\- Service keys

\- Worship Mode

\- Favorites

\- Personal notes

\- Personal song preferences

\- Mobile responsive experience

\- PWA capabilities

\- Security

\- Row Level Security

\- Organization data isolation



These capabilities belong to the HIMIG platform rather than to one specific church.



---



## 3. Organization Boundary



An organization represents a church, worship ministry, worship team, or other group using HIMIG.



The first organization is:



KCCC Psalmist



Future organizations may include other churches or worship teams.



Conceptually:



HIMIG

|

+-- Organization

|   |

|   +-- Members

|   +-- Songs

|   +-- Setlists

|   +-- Setlist Songs

|   +-- Organization Settings

|

+-- Personal User Data

|

+-- Platform Services



The organization boundary is the foundation for future multi-church support.



---



## 4. Organization Membership



Users will eventually belong to one or more organizations through an organization membership model.



Conceptually, the future relationship is:



User

|

+-- Organization Membership

        |

        +-- Organization

        +-- Role



The membership relationship will determine which organization a user is currently accessing and which role they have within that organization.



The existing HIMIG role model remains unchanged.



---



## 5. Current Role Model



The current role model is retained.



### Owner/Admin



Owner/Admin has full access to the organization.



Owner/Admin can:



\- Manage shared songs

\- Manage shared setlists

\- Manage setlist songs

\- Manage team members

\- Access all permitted organization data

\- Perform administrative operations



### Worship Leader



Worship Leader can:



\- Edit song lyrics

\- Create setlists

\- View setlists

\- Edit shared setlists

\- Delete shared setlists

\- Manage setlist songs according to the existing permission model



Worship Leader cannot edit:



\- Chords

\- Tabs

\- Nashville Number Code



### Musician



Musician can:



\- Edit chords

\- Edit tabs

\- Edit Nashville Number Code

\- Create setlists

\- View setlists

\- Edit shared setlists

\- Manage setlist songs according to the existing permission model



Musician cannot edit:



\- Lyrics



Musician cannot delete shared setlists.



### Viewer



Viewer is read-only.



Viewer can:



\- View permitted songs

\- View permitted setlists

\- View permitted worship content



Viewer cannot modify shared organization data.



---



## 6. Shared Organization Data



The following data is planned to become organization-owned:



\- Songs

\- Setlists

\- Setlist Songs



These records represent shared worship-team resources.



They should not belong exclusively to the user who originally created them.



Instead, they should belong to an organization.



Conceptually:



Organization

|

+-- Songs

+-- Setlists

+-- Setlist Songs



The organization becomes the primary ownership boundary for shared data.



---



## 7. Personal User Data



Personal data remains associated with individual users.



The following features are personal:



\- Favorites

\- Personal Notes

\- Personal Song Preferences



Conceptually:



User

|

+-- Favorites

+-- Personal Notes

+-- Personal Song Preferences



Personal data should not become shared organization data merely because the referenced song belongs to an organization.



---



## 8. Recent Songs



Recent Songs has been permanently removed from the HIMIG product.



The historical database table may still exist in the current Supabase project.



It should not be treated as an active product feature or as part of the future product architecture.



Any future cleanup of the historical table must be handled separately after confirming that no application or policy dependencies remain.



---



## 9. Song Architecture



The future song architecture is:



Organization

|

+-- Songs

     |

     +-- Song Metadata

     +-- Lyrics

     +-- Chords

     +-- Nashville Number Code

     +-- Tabs

     +-- Key

     +-- BPM

     +-- Time Signature

     +-- Language

     +-- Category



A song belongs to an organization.



Users interact with the song according to their organization role.



Field-level permissions remain part of the security model.



---



## 10. Song Permission Architecture



The future organization model does not change the existing field-level permission model.



Owner/Admin:



Full song editing access.



Worship Leader:



Lyrics only.



Musician:



Chords, tabs, and Nashville Number Code only.



Viewer:



Read-only.



This separation must continue to be enforced by both:



\- Frontend authorization

\- Database authorization



Frontend restrictions alone are not considered sufficient.



---



## 11. Setlist Architecture



The future setlist model is:



Organization

|

+-- Setlists

     |

     +-- Setlist Metadata

     +-- Setlist Songs

             |

             +-- Song Reference

             +-- Position

             +-- Service Key



A setlist belongs to an organization.



Its songs are connected through setlist\_songs.



The setlist relationship must remain intact during migration.



---



## 12. Setlist Permission Architecture



The existing setlist permissions remain unchanged.



Owner/Admin:



\- Create

\- View

\- Edit

\- Delete



Worship Leader:



\- Create

\- View

\- Edit

\- Delete



Musician:



\- Create

\- View

\- Edit

\- No Delete



Viewer:



\- View only



The future organization model must preserve these permissions.



---



## 13. Setlist Song Architecture



setlist\_songs connects:



\- Organization-owned setlists

\- Organization-owned songs



The existing relationships must be preserved.



The following information must remain intact during future migration:



\- setlist\_id

\- song\_id

\- position

\- service\_key

\- existing record IDs

\- timestamps where applicable



The migration must not unnecessarily recreate setlist-song relationships.



---



## 14. Authentication Architecture



Supabase Auth remains the authentication foundation.



The future architecture does not require replacing the current authentication system.



The logical model becomes:



Supabase Auth User

|

+-- Profile

|

+-- Organization Membership

        |

        +-- Organization

        +-- Role



Authentication identifies the user.



Organization membership determines organizational context.



Role determines permissions within that context.



---



## 15. Profile Architecture



The existing profiles table currently contains:



\- id

\- display\_name

\- role

\- created\_at

\- updated\_at



The current profile structure remains operational during the transition.



Future organization membership should not be introduced by removing the existing role model immediately.



Instead, organization membership should be introduced additively.



The exact final profile/membership schema will be determined during Phase C.



---



## 16. Organization Settings



Future organizations may contain organization-level settings such as:



\- Organization name

\- Team name

\- Logo

\- Branding

\- Accent color

\- Service preferences

\- Worship settings



These settings are organization-level configuration.



They should not be hard-coded into the HIMIG platform.



KCCC-specific branding belongs to the KCCC organization rather than to the HIMIG platform.



---



## 17. Platform Branding vs Organization Branding



HIMIG branding and organization branding are separate concepts.



Platform branding:



HIMIG

REST NOTE



Organization branding:



KCCC Psalmist



The future architecture should allow an organization to configure its own:



\- Name

\- Team name

\- Logo

\- Visual identity



without changing the HIMIG platform identity.



---



## 18. Organization Isolation



The future architecture must prevent users from accessing data belonging to organizations they are not members of.



Organization isolation applies to:



\- Songs

\- Setlists

\- Setlist Songs

\- Organization settings

\- Organization members



The primary enforcement mechanism should be PostgreSQL Row Level Security.



Frontend filtering must not be treated as the primary security boundary.



---



## 19. Personal Data Isolation



Personal data must remain isolated by user.



The future architecture should preserve the principle:



auth.uid() = user\_id



for tables that contain a user\_id ownership field.



Personal records should never become visible to another organization member simply because both users access the same song.



---



## 20. personal\_song\_preferences Investigation



The current personal\_song\_preferences table does not contain a user\_id column.



This is an important architecture issue.



The current implementation must be inspected before changing the schema.



Phase B4 does not modify this table.



Before the future multi-organization migration, we must determine:



\- How ownership is currently enforced

\- Which application code writes to the table

\- Which policies protect the table

\- Whether the current design relies on another relationship

\- Whether user\_id must eventually be added



No assumption should be made until the current implementation is verified.



---



## 21. RLS Architecture



The future security model will use multiple layers.



### Layer 1 - Authentication



Supabase Auth identifies the user.



### Layer 2 - Organization Membership



Membership determines which organization the user belongs to.



### Layer 3 - Role



Role determines what actions the user may perform.



### Layer 4 - Row Level Security



RLS determines which rows the user may access.



### Layer 5 - Field-Level Authorization



Song update logic determines which song fields a role may modify.



### Layer 6 - Frontend Authorization



The frontend hides or disables actions that the user cannot perform.



The database remains the authoritative security boundary.



---



## 22. Organization-Aware RLS



Future RLS policies will conceptually evaluate:



1\. Is the user authenticated?

2\. Is the user a member of the organization?

3\. What role does the user have?

4\. Does that role permit the requested operation?



The exact SQL implementation belongs to Phase C.



No new organization-aware RLS policies are created in Phase B4.



---



## 23. Migration Architecture



The migration from the current KCCC implementation to the future organization model should be additive.



The preferred sequence is:



Current KCCC data

|

+-- Create Organization

|

+-- Create Organization Memberships

|

+-- Add organization ownership to shared data

|

+-- Backfill KCCC organization references

|

+-- Verify relationships

|

+-- Introduce organization-aware RLS

|

+-- Update application queries

|

+-- Verify permissions

|

+-- Remove legacy assumptions only after verification



The current application should continue functioning during the transition whenever practical.



---



## 24. KCCC Psalmist as First Organization



KCCC Psalmist will be the first organization in the future multi-organization architecture.



Existing KCCC data should be assigned to the KCCC organization.



This includes:



\- Existing users

\- Existing shared songs

\- Existing setlists

\- Existing setlist songs



Personal data remains associated with individual users.



No existing record should be discarded simply because the architecture changes.



---



## 25. Data Preservation



Migration must preserve:



\- User identities

\- Profile records

\- Song IDs

\- Song content

\- Setlist IDs

\- Setlist content

\- Setlist-song relationships

\- Song ordering

\- Service keys

\- Favorites

\- Personal notes

\- Personal song preferences where their ownership can be verified



Existing relationships should be preserved whenever possible.



---



## 26. Backward Compatibility



The migration should avoid requiring a complete rewrite of the application in one step.



Preferred strategy:



1\. Introduce new organization structures.

2\. Backfill existing KCCC records.

3\. Maintain compatibility with existing application behavior.

4\. Update database authorization.

5\. Update application queries.

6\. Verify production behavior.

7\. Remove obsolete assumptions only after successful verification.



This reduces migration risk.



---



## 27. What Remains Untouched During B4



B4 does not modify:



\- Supabase tables

\- Supabase columns

\- Supabase policies

\- Supabase functions

\- Supabase triggers

\- Authentication

\- Profiles

\- Song data

\- Setlist data

\- Frontend code

\- Worship Mode

\- Chord engine

\- PWA configuration

\- Vercel configuration



B4 only finalizes the architecture documentation.



---



## 28. Future Phase C Changes



Phase C is where the actual multi-organization database architecture will begin.



Expected Phase C work includes:



\- organizations table

\- organization membership table

\- organization ownership fields

\- organization-aware relationships

\- organization-aware RLS

\- organization isolation

\- migration/backfill

\- verification queries

\- compatibility planning



Each database change must be reviewed before execution.



---



## 29. Future Phase D Changes



Phase D will focus on organization onboarding.



Expected capabilities include:



\- Create organization

\- Create organization administrator

\- Invite members

\- Assign roles

\- Import songs

\- Create setlists

\- Configure organization settings



These features should be implemented only after the Phase C architecture is verified.



---



## 30. Future Phase E Changes



Phase E will focus on customization.



Expected organization-level settings include:



\- Church name

\- Team name

\- Logo

\- Accent color

\- Service settings

\- Worship settings

\- Team settings



These settings should be stored as organization configuration rather than hard-coded application values.



---



## 31. Future Phase F Changes



Phase F will address commercialization.



Potential areas include:



\- Product positioning

\- Feature packages

\- Demonstration environment

\- Pricing

\- Subscription or licensing model

\- Onboarding

\- Support

\- Terms

\- Privacy

\- Sales materials



Commercial decisions are outside the scope of B4.



---



## 32. Current Architecture vs Future Architecture



### Current



HIMIG

|

+-- KCCC Psalmist

    |

    +-- Profiles

    +-- Songs

    +-- Setlists

    +-- Setlist Songs

    +-- Personal User Data



The current implementation is effectively KCCC-centric.



### Future



HIMIG

|

+-- Organization A

|   |

|   +-- Members

|   +-- Songs

|   +-- Setlists

|   +-- Setlist Songs

|

+-- Organization B

|   |

|   +-- Members

|   +-- Songs

|   +-- Setlists

|   +-- Setlist Songs

|

+-- Personal User Data

|

+-- Platform Services



The future architecture separates platform functionality from organization data.



---



## 33. Architecture Decision Summary



The following decisions are finalized for planning purposes:



1\. HIMIG is the platform.

2\. KCCC Psalmist is the first organization.

3\. Shared songs are organization-owned.

4\. Shared setlists are organization-owned.

5\. Setlist songs belong to organization-owned setlists and songs.

6\. Favorites remain personal.

7\. Personal notes remain personal.

8\. Personal song preferences remain personal.

9\. Recent Songs is removed from the product.

10\. The existing role model remains unchanged.

11\. Organization membership will become the future organizational access boundary.

12\. RLS will enforce organization isolation.

13\. Frontend authorization remains important but is not the primary security boundary.

14\. Existing IDs and relationships should be preserved during migration.

15\. Migration should be additive and backward-compatible.

16\. Production changes begin only in Phase C.

17\. KCCC-specific branding belongs to the organization.

18\. HIMIG platform branding remains separate from organization branding.



---



## 34. Architectural Principles



HIMIG development should follow these principles:



### Preserve Working Behavior



Do not rewrite functioning features without a clear architectural reason.



### Change One Boundary at a Time



Database, security, frontend, and migration changes should be separated when practical.



### Verify Before Migrating



Inspect actual schema, policies, functions, triggers, and application dependencies before modifying them.



### Preserve Existing Data



Migration should preserve IDs, content, relationships, and personal data.



### Security at the Database Layer



RLS remains the authoritative data-access boundary.



### Organization Isolation



An organization must never gain access to another organization's shared data.



### Personal Privacy



Personal user data remains user-scoped.



### Explicit Permissions



The locked role permissions must remain unchanged unless intentionally revised.



### Minimal Targeted Changes



Future implementation should modify only what is necessary to introduce organization support.



---



## 35. Relationship to Previous Architecture Documents



This document builds on:



\- docs/architecture.md

\- docs/security-and-rls.md

\- docs/role-permissions.md

\- docs/mobile-pwa.md

\- docs/himig-case-study.md

\- docs/portfolio-presentation.md

\- docs/product-architecture.md

\- docs/current-schema.md

\- docs/migration-strategy.md



The documents serve different purposes.



### architecture.md



Documents the current technical architecture.



### security-and-rls.md



Documents the current security and RLS model.



### role-permissions.md



Documents the current role and permission model.



### mobile-pwa.md



Documents the current mobile and PWA architecture.



### product-architecture.md



Defines the initial conceptual separation between HIMIG and KCCC Psalmist.



### current-schema.md



Documents the verified current database schema.



### migration-strategy.md



Documents how the current KCCC architecture can transition toward organization-based ownership.



### product-architecture-final.md



Finalizes the combined future product architecture and establishes the boundary between planning and implementation.



---



## 36. B4 Completion Criteria



Phase B4 is complete when:



\- The HIMIG platform boundary is documented.

\- The organization boundary is documented.

\- Shared data ownership is documented.

\- Personal data ownership is documented.

\- Role behavior is preserved.

\- Organization isolation is defined.

\- Future RLS direction is defined.

\- Migration principles are defined.

\- KCCC Psalmist is identified as the first organization.

\- Future phases are clearly separated.

\- No production database changes have been performed.



---



## 37. B4 Status



Phase B4 is documentation and architecture planning only.



Status:



Architecture finalized for future implementation.



No production migration has been performed.



No organization tables have been created.



No organization membership records have been created.



No existing KCCC data has been changed.



No RLS policies have been changed.



No frontend code has been changed.



The next implementation phase is Phase C - Multi-Church Architecture.



---



## 38. Final Target Architecture



The long-term HIMIG architecture is:



HIMIG Platform

|

+-- Authentication

|

+-- Organizations

|   |

|   +-- Organization Members

|   |     |

|   |     +-- Owner/Admin

|   |     +-- Worship Leader

|   |     +-- Musician

|   |     +-- Viewer

|   |

|   +-- Shared Songs

|   |

|   +-- Shared Setlists

|   |

|   +-- Setlist Songs

|   |

|   +-- Organization Settings

|

+-- Personal User Data

|   |

|   +-- Favorites

|   +-- Personal Notes

|   +-- Personal Song Preferences

|

+-- Platform Services

    |

    +-- Chord Engine

    +-- Key Transposition

    +-- Worship Mode

    +-- Mobile/PWA

    +-- Security/RLS



This architecture allows HIMIG to support multiple churches and worship organizations while preserving organization isolation, role-based permissions, personal user data, and the existing worship workflow.



---



## 39. Summary



B4 finalizes the future HIMIG product architecture.



HIMIG is the reusable platform.



KCCC Psalmist is the first organization.



Shared worship resources belong to organizations.



Personal user data remains personal.



Existing roles remain unchanged.



Organization membership becomes the future access boundary.



RLS becomes the primary organization isolation mechanism.



The migration must preserve existing data and relationships.



Implementation begins only in Phase C.



Until then, the current HIMIG application remains the working KCCC Psalmist implementation.

