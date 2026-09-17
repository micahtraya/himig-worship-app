# HIMIG Migration Strategy



## Phase B3 - Migration Strategy



This document defines the planned migration path from the current KCCC Psalmist-specific HIMIG implementation toward a future multi-organization HIMIG platform.



This phase is documentation and architecture planning only.



No production database schema, RLS policy, authentication flow, or frontend behavior is changed by this document.



---



# 1. Purpose



HIMIG currently operates as a songbook platform for KCCC Psalmist.



The long-term product direction is to make HIMIG capable of supporting multiple churches, worship teams, or organizations while preserving the existing KCCC implementation and its data.



The migration must therefore be:



* additive where possible

* backward-compatible

* incremental

* reversible

* data-preserving

* security-conscious

* minimally disruptive to the existing application



The objective is not to rebuild HIMIG.



The objective is to introduce organization awareness around the existing working system.



---



# 2. Current Architecture



The current implementation is effectively organized around one organization: KCCC Psalmist.



The major shared entities are:



* profiles

* songs

* setlists

* setlist\_songs



Personal entities include:



* favorites

* personal\_notes

* personal\_song\_preferences



The current architecture does not yet contain an explicit organization table or organization membership table.



Conceptually, the current system behaves like:



```text

HIMIG

|

+-- KCCC Psalmist

    |

    +-- Profiles

    +-- Songs

    +-- Setlists

    |   +-- Setlist Songs

    |

    +-- Personal User Data

        +-- Favorites

        +-- Personal Notes

        +-- Personal Song Preferences

```



---



# 3. Target Architecture



The future HIMIG architecture should support multiple independent organizations.



Conceptually:



```text

HIMIG Platform

|

+-- Organization A

|   +-- Members

|   +-- Songs

|   +-- Setlists

|       +-- Setlist Songs

|

+-- Organization B

|   +-- Members

|   +-- Songs

|   +-- Setlists

|       +-- Setlist Songs

|

+-- Organization C

    +-- Members

    +-- Songs

    +-- Setlists

        +-- Setlist Songs

```



Users may eventually belong to one or more organizations.



Each organization should have its own shared data boundary.



---



# 4. Migration Principles



The migration should follow these principles.



## 4.1 Preserve existing data



Existing KCCC users, songs, setlists, setlist relationships, favorites, notes, and other valid personal data should not be discarded during the migration.



---



## 4.2 Add before removing



New organization concepts should be introduced before removing or changing existing ownership behavior.



This reduces migration risk.



---



## 4.3 Avoid a big-bang migration



The migration should happen through controlled stages rather than one large database rewrite.



Each stage should be independently verified.



---



## 4.4 Maintain application compatibility



The existing HIMIG frontend should continue functioning while the organization model is introduced.



Frontend migration should occur only after the underlying organization model is verified.



---



## 4.5 Preserve role semantics



The existing HIMIG role model remains unchanged:



* Owner/Admin

* Worship Leader

* Musician

* Viewer



Organization architecture should determine which organization a user belongs to.



The existing role model should determine what the user can do within that organization.



---



## 4.6 Preserve personal data ownership



Personal data must remain associated with the authenticated user.



Organization membership must not accidentally turn personal data into shared organizational data.



---



# 5. First Organization: KCCC Psalmist



The first organization created in the future organization model should represent the existing KCCC Psalmist environment.



Conceptually:



```text

organizations

|

+-- KCCC Psalmist

```



Existing KCCC data would then become associated with this organization.



The migration should not create a second copy of every song or setlist unless there is a documented reason to do so.



The preferred approach is to associate existing records with the new organization identity.



---



# 6. Organization Membership



A future organization membership model should establish the relationship between users and organizations.



Conceptually:



```text

User

|

+-- Organization Membership

    |

    +-- Organization

    +-- Role

```



For KCCC:



```text

Existing User

|

+-- KCCC Psalmist

    +-- Existing HIMIG Role

```



Other team members would similarly become members of KCCC with their existing HIMIG roles.



The migration must preserve the existing role assigned to each profile.



---



# 7. Existing Profiles



The current `profiles` table contains:



* `id`

* `display\_name`

* `role`

* `created\_at`

* `updated\_at`



The existing profile identity should remain intact.



The future organization model should not require replacing profile IDs.



Instead, organization membership should be layered onto the existing user identity.



Conceptually:



```text

profiles

|

+-- organization\_memberships

    |

    +-- organizations

```



This allows authentication and user identity to remain stable.



---



# 8. Shared Songs Migration



The current `songs` table contains shared song-library records.



The future architecture should associate each shared song with an organization.



Conceptually:



```text

KCCC Psalmist

|

+-- Songs

    +-- Existing KCCC songs

    +-- Existing KCCC songs

    +-- Existing KCCC songs

```



Existing song IDs should be preserved wherever practical.



This is important because other records may already reference those song IDs.



For example:



```text

songs

|

+-- favorites

+-- personal\_notes

+-- personal\_song\_preferences

+-- setlist\_songs

```



Changing song IDs unnecessarily would increase migration complexity.



---



# 9. Shared Setlists Migration



The current `setlists` table contains shared setlists.



The future organization model should associate each setlist with an organization.



Conceptually:



```text

KCCC Psalmist

|

+-- Setlists

    +-- Existing KCCC setlists

    +-- Existing KCCC setlists

    +-- Existing KCCC setlists

```



Existing setlist IDs should be preserved.



The existing `created\_by` relationship should also remain meaningful.



---



# 10. Setlist Songs



The `setlist\_songs` table connects songs to setlists.



Current fields include:



* `id`

* `setlist\_id`

* `song\_id`

* `position`

* `created\_at`

* `service\_key`



This relationship should remain intact during migration.



The migration should not recreate setlist/song relationships unless required.



The target relationship remains:



```text

Organization

|

+-- Setlist

|   |

|   +-- setlist\_songs

|       |

|       +-- Song

|

+-- Songs

```



Existing:



* song order

* setlist membership

* service key



must be preserved.



---



# 11. Personal Favorites



The `favorites` table contains:



* `user\_id`

* `song\_id`

* `created\_at`



Favorites are personal user data.



They should remain associated with the authenticated user.



Organization migration should not convert favorites into organization-wide records.



Conceptually:



```text

User

|

+-- Favorites

    |

    +-- Organization Song

```



The user's favorite relationship remains personal even though the song belongs to an organization.



---



# 12. Personal Notes



The `personal\_notes` table contains:



* `user\_id`

* `song\_id`

* `notes`

* `created\_at`

* `updated\_at`



Personal notes should remain private to the user.



The future organization model should preserve this ownership boundary.



Conceptually:



```text

Organization Song

|

+-- User A's Notes

+-- User B's Notes

+-- User C's Notes

```



Users should not automatically gain access to another member's notes merely because they belong to the same organization.



---



# 13. Personal Song Preferences



The current `personal\_song\_preferences` table requires additional investigation before migration.



The verified current schema does not contain a `user\_id` column.



Current fields include:



* `id`

* `song\_id`

* `preferred\_key`

* `arrangement`

* `capo`

* `notes`

* `created\_at`

* `updated\_at`



This creates an architectural question because the product model treats these preferences as personal data, but the current schema does not visibly identify the owning user.



Before modifying this table, the migration process must inspect:



* current frontend usage

* Supabase queries

* insert/update behavior

* RLS policies

* ownership assumptions

* whether another mechanism currently determines ownership

* whether the table is actually being used as intended



No schema correction should be made solely from the column list.



This investigation is a required B3 task.



---



# 14. Recent Songs



The Recent Songs feature has been permanently removed from the HIMIG product scope.



The existing `recent\_songs` database table may still exist, but it is not considered an active product feature.



It should therefore not be included in the future active organization architecture.



Any database cleanup involving `recent\_songs` should be handled separately after confirming that no remaining application or security dependency exists.



---



# 15. Organization-Owned Data



The future shared-data model should conceptually become:



```text

Organization

|

+-- Members

+-- Songs

+-- Setlists

+-- Setlist Songs

```



These are organization-scoped resources.



Users should only access shared organization resources through organizations to which they belong.



---



# 16. Personal Data



Personal data remains user-scoped:



```text

User

|

+-- Favorites

+-- Personal Notes

+-- Personal Song Preferences

```



The organization relationship of the referenced song does not change the personal ownership of these records.



This distinction is important for future multi-church security.



---



# 17. Role Interaction



The organization model should not replace the existing HIMIG permission model.



Instead:



```text

Organization Membership

|

+-- determines organization access

    |

    +-- Role

        |

        +-- determines permissions

```



The existing role permissions remain:



| Role           | Shared Songs                 | Shared Setlists         | Setlist Songs      |

| -------------- | ---------------------------- | ----------------------- | ------------------ |

| Owner/Admin    | Full access                  | Create/View/Edit/Delete | Full access        |

| Worship Leader | Lyrics only                  | Create/View/Edit/Delete | Add/Remove/Reorder |

| Musician       | Chords/Tabs/Number Code only | Create/View/Edit        | Add/Remove/Reorder |

| Viewer         | View only                    | View only               | View only          |



The organization migration must preserve these existing boundaries.



---



# 18. Future Organization Isolation



The major security objective of the migration is organization isolation.



For example:



```text

Organization A

|

+-- Songs A

+-- Setlists A



Organization B

|

+-- Songs B

+-- Setlists B

```



A member of Organization A should not automatically see or modify Organization B's shared resources.



This should eventually be enforced at the database level through RLS.



Frontend filtering alone must not be treated as sufficient security.



---



# 19. RLS Migration Strategy



The future RLS model should transition from the current KCCC-centric authorization model toward organization-aware authorization.



The target conceptual check becomes:



```text

Authenticated User

|

+-- Organization Membership

    |

    +-- Organization Resource

        |

        +-- Role Permission

```



A future policy may therefore conceptually evaluate:



1\. Is the user authenticated?

2\. Is the user a member of the organization?

3\. What role does the user hold?

4\. Does that role permit the requested operation?

5\. Does the operation comply with field-level restrictions where applicable?



The exact SQL implementation should be designed only after the organization schema is finalized.



---



# 20. Migration Sequence



The preferred migration sequence is:



### Stage 1 - Documentation



Document:



* current schema

* current ownership

* current permissions

* future organization model

* migration dependencies



This is the current B3 stage.



---



### Stage 2 - Investigate Existing Ownership



Before schema changes:



* inspect application queries

* inspect RLS policies

* inspect ownership functions

* inspect `personal\_song\_preferences`

* identify hidden assumptions

* identify any KCCC-specific logic



No production changes yet.



---



### Stage 3 - Introduce Organization Structures



Future schema additions would conceptually include:



```text

organizations

organization\_memberships

```



Additional organization ownership fields would then be introduced carefully to shared resources.



This stage should be additive.



---



### Stage 4 - Create KCCC Organization



Create the initial organization:



```text

KCCC Psalmist

```



No existing users or data should be deleted.



---



### Stage 5 - Assign Existing Users



Associate current KCCC profiles with the KCCC organization.



Preserve existing roles.



---



### Stage 6 - Associate Existing Shared Data



Associate current KCCC songs and setlists with the KCCC organization.



Preserve IDs and relationships.



---



### Stage 7 - Verify Personal Data



Verify that:



* favorites remain user-specific

* personal notes remain user-specific

* personal song preferences remain correctly owned

* no personal data becomes organization-visible accidentally



---



### Stage 8 - Introduce Organization-Aware RLS



Only after organization membership and ownership data are verified should RLS policies transition toward organization isolation.



---



### Stage 9 - Update Frontend



After database behavior is verified:



* load organization membership

* determine active organization

* display organization-scoped data

* preserve existing role-based UI permissions



---



### Stage 10 - Verify End-to-End



Test:



* login

* profile resolution

* organization membership

* song access

* song editing

* setlist access

* setlist editing

* setlist deletion

* setlist song management

* favorites

* personal notes

* personal preferences

* Worship Mode

* organization isolation



---



# 21. Backward Compatibility



During migration, the existing KCCC implementation should remain usable.



The migration should avoid simultaneously changing:



* authentication

* role definitions

* song editing rules

* setlist permissions

* Worship Mode

* chord/transposition logic

* mobile navigation

* PWA behavior



unless a specific migration dependency requires it.



The goal is to introduce organization awareness without destabilizing working features.



---



# 22. Rollback Strategy



Every production migration should have a clear rollback strategy.



Before schema or RLS changes:



1\. Create a verified application backup.

2\. Record the current Git commit.

3\. Record the current Supabase schema and policies.

4\. Record migration SQL.

5\. Apply changes incrementally.

6\. Verify after each migration stage.



If a migration causes unexpected behavior, the affected stage should be reversible without requiring reconstruction of the entire database.



---



# 23. Data Integrity Requirements



The migration must preserve:



* user IDs

* profile IDs

* song IDs

* setlist IDs

* setlist/song relationships

* song positions

* service keys

* favorite relationships

* personal notes

* valid personal preferences

* created/updated timestamps where practical



Foreign-key relationships must remain valid.



---



# 24. KCCC as the First Organization



KCCC Psalmist should be treated as the first organization in the multi-organization model.



This gives HIMIG a real migration target without requiring a second church or test organization.



The first organization should therefore be migrated from the existing production data rather than created as a disconnected demo environment.



---



# 25. What Will NOT Change in B3



B3 does not authorize:



* creating database tables

* adding organization columns

* modifying RLS policies

* changing Supabase functions

* changing authentication

* changing profiles

* changing role permissions

* changing song permissions

* changing setlist permissions

* changing frontend code

* changing Worship Mode

* changing mobile navigation

* changing PWA configuration

* adding subscriptions

* adding billing

* creating additional organizations

* migrating production data



These are future implementation stages.



---



# 26. Migration Risks



Important risks include:



### Risk 1 - Incorrect ownership assumptions



Existing tables may contain ownership logic that is not obvious from the schema.



Mitigation:



Inspect application queries and RLS before changing ownership.



---



### Risk 2 - Personal song preference ownership



`personal\_song\_preferences` currently has no visible `user\_id`.



Mitigation:



Investigate actual usage and RLS before proposing a schema modification.



---



### Risk 3 - RLS regression



Organization-aware RLS could accidentally block legitimate KCCC access or expose another organization's data.



Mitigation:



Introduce policies incrementally and test each role.



---



### Risk 4 - Broken relationships



Changing IDs or recreating shared records could break favorites, notes, or setlists.



Mitigation:



Prefer preserving existing IDs and relationships.



---



### Risk 5 - Frontend assumptions



Current frontend code may assume a single organization.



Mitigation:



Identify KCCC-specific assumptions before introducing organization selection or context.



---



# 27. Recommended Migration Philosophy



The migration should follow:



```text

Understand

    |

    v

Document

    |

    v

Investigate

    |

    v

Add

    |

    v

Migrate

    |

    v

Verify

    |

    v

Enforce

    |

    v

Update UI

    |

    v

Expand

```



Not:



```text

Rewrite everything

    |

    v

Hope it works

```



The existing HIMIG application is the baseline that the future platform should evolve from.



---



# 28. Relationship to Previous Architecture Documents



B3 builds directly on:



* `docs/architecture.md`

* `docs/security-and-rls.md`

* `docs/role-permissions.md`

* `docs/mobile-pwa.md`

* `docs/product-architecture.md`

* `docs/current-schema.md`



The documents have different purposes:



```text

architecture.md

    |

    +-- Current technical architecture



security-and-rls.md

    |

    +-- Current security model



role-permissions.md

    |

    +-- Current authorization model



mobile-pwa.md

    |

    +-- Current mobile/PWA architecture



product-architecture.md

    |

    +-- Future HIMIG product boundary



current-schema.md

    |

    +-- Actual database structure



migration-strategy.md

    |

    +-- How to move safely from current to future

```



---



# 29. B3 Status



Phase B3 is complete when the migration strategy has been documented and reviewed.



No production implementation is required for B3.



The next architecture stage should use this document as the migration planning reference before any organization-related database changes are made.



---



# 30. Final Migration Target



The eventual HIMIG architecture should become:



```text

                         HIMIG

                           |

             +-------------+-------------+

             |                           |

       Organization A              Organization B

             |                           |

       +-----+-----+                 +---+-----+

       |     |     |                 |   |     |

     Users Songs Setlists          Users Songs Setlists

                   |                         |

              Setlist Songs             Setlist Songs

```



Personal User Data remains user-scoped:



```text

User

|

+-- Favorites

+-- Personal Notes

+-- Personal Song Preferences

```



The platform therefore separates:



**HIMIG platform capabilities**



from



**organization-owned shared data**



from



**individual user-owned personal data**.



This separation is the foundation for future multi-church support.



---



# 31. Summary



B3 establishes a controlled migration strategy for transforming HIMIG from a KCCC-specific implementation into a multi-organization platform.



The central approach is:



* preserve existing identities

* preserve existing data

* preserve existing relationships

* introduce organization structures additively

* assign KCCC as the first organization

* preserve existing roles

* keep personal data personal

* investigate ambiguous ownership before modifying it

* transition RLS only after organization membership is verified

* update the frontend after database behavior is proven

* maintain rollback capability throughout the migration



The migration is intentionally designed as an evolution of the working HIMIG application rather than a rewrite.



**B3 is a planning phase. No production changes are authorized by this document.**



