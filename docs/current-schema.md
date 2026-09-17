# HIMIG Current Database Schema



## Overview



This document records the actual Supabase database structure of the current HIMIG implementation.



This is a documentation snapshot for Phase B2 - Current Schema Mapping.



The purpose of Phase B2 is to understand the existing database before introducing the future multi-organization architecture.



No database changes are part of this phase.



---



# Current Architecture



The current HIMIG implementation was built around KCCC Psalmist as the active team/organization.



The database does not currently contain an explicit organization layer.



Conceptually, the current structure is:



```text

HIMIG

â””â”€â”€ KCCC Psalmist

&#x20;   â”œâ”€â”€ Profiles

&#x20;   â”œâ”€â”€ Songs

&#x20;   â”œâ”€â”€ Setlists

&#x20;   â””â”€â”€ Setlist Songs



User Personal Data

â”œâ”€â”€ Favorites

â”œâ”€â”€ Personal Notes

â””â”€â”€ Personal Song Preferences

```



---



# Current Tables



The current relevant public tables are:



\* `profiles`

\* `songs`

\* `setlists`

\* `setlist\_songs`

\* `favorites`

\* `personal\_notes`

\* `personal\_song\_preferences`



The `recent\_songs` table may still exist in the database, but the Recent Songs feature has been permanently removed from the HIMIG product and is no longer part of the active application architecture.



---



# 1. profiles



The `profiles` table represents authenticated HIMIG users and their current role.



## Columns



| Column         | Type        | Nullable | Default              |

| -------------- | ----------- | -------: | -------------------- |

| `id`           | uuid        |       No | None                 |

| `display\_name` | text        |      Yes | None                 |

| `role`         | text        |       No | `'subscriber'::text` |

| `created\_at`   | timestamptz |       No | `now()`              |

| `updated\_at`   | timestamptz |       No | `now()`              |



## Current role model



The current HIMIG role model is:



\* Owner/Admin

\* Worship Leader

\* Musician

\* Viewer



The application's role permissions are documented separately in:



`docs/role-permissions.md`



---



# 2. songs



The `songs` table contains the shared HIMIG song library.



## Columns



| Column           | Type        | Nullable | Default             |

| ---------------- | ----------- | -------: | ------------------- |

| `id`             | uuid        |       No | `gen\_random\_uuid()` |

| `title`          | text        |       No | None                |

| `artist`         | text        |       No | None                |

| `album`          | text        |       No | None                |

| `language`       | text        |       No | `'English'::text`   |

| `category`       | text        |       No | `'World'::text`     |

| `bpm`            | text        |      Yes | None                |

| `time\_signature` | text        |       No | `'4/4'::text`       |

| `lyrics`         | text        |       No | `''::text`          |

| `chords`         | text        |       No | `''::text`          |

| `number\_root`    | text        |       No | `''::text`          |

| `bar`            | text        |       No | `''::text`          |

| `created\_by`     | uuid        |      Yes | None                |

| `created\_at`     | timestamptz |       No | `now()`             |

| `updated\_at`     | timestamptz |       No | `now()`             |

| `key`            | text        |      Yes | None                |



## Current ownership model



Songs are shared team data.



The `created\_by` column records the user who created the song.



There is currently no `organization\_id` or equivalent organization ownership column.



---



# 3. setlists



The `setlists` table contains shared team setlists.



## Columns



| Column        | Type        | Nullable | Default             |

| ------------- | ----------- | -------: | ------------------- |

| `id`          | uuid        |       No | `gen\_random\_uuid()` |

| `name`        | text        |       No | None                |

| `access\_code` | text        |      Yes | None                |

| `description` | text        |      Yes | None                |

| `created\_by`  | uuid        |      Yes | None                |

| `created\_at`  | timestamptz |       No | `now()`             |

| `updated\_at`  | timestamptz |       No | `now()`             |



## Current ownership model



Setlists are shared team data.



The `created\_by` column identifies the user who created the setlist.



There is currently no explicit organization ownership column.



---



# 4. setlist\_songs



The `setlist\_songs` table connects songs to setlists.



It also stores ordering and the service key used for the setlist song.



## Columns



| Column        | Type        | Nullable | Default             |

| ------------- | ----------- | -------: | ------------------- |

| `id`          | uuid        |       No | `gen\_random\_uuid()` |

| `setlist\_id`  | uuid        |       No | None                |

| `song\_id`     | uuid        |       No | None                |

| `position`    | integer     |       No | `0`                 |

| `created\_at`  | timestamptz |       No | `now()`             |

| `service\_key` | text        |      Yes | None                |



## Current relationship



```text

setlists

&#x20;  â”‚

&#x20;  â””â”€â”€ setlist\_songs

&#x20;          â”‚

&#x20;          â””â”€â”€ songs

```



A setlist contains references to songs through `setlist\_songs`.



`position` controls the ordering of songs within the setlist.



`service\_key` stores the service-specific key associated with that setlist song.



There is currently no explicit organization column in this table.



---



# 5. favorites



The `favorites` table stores songs that an individual user has marked as favorites.



## Columns



| Column       | Type        | Nullable | Default             |

| ------------ | ----------- | -------: | ------------------- |

| `id`         | uuid        |       No | `gen\_random\_uuid()` |

| `user\_id`    | uuid        |       No | None                |

| `song\_id`    | uuid        |       No | None                |

| `created\_at` | timestamptz |       No | `now()`             |



## Ownership model



Favorites are personal user data.



The ownership field is:



`user\_id`



The intended security model restricts a user's favorites to that authenticated user.



Conceptually:



```text

User

â””â”€â”€ Favorites

&#x20;   â””â”€â”€ Song

```



---



# 6. personal\_notes



The `personal\_notes` table stores private notes associated with songs.



## Columns



| Column       | Type        | Nullable | Default |

| ------------ | ----------- | -------: | ------- |

| `user\_id`    | uuid        |       No | None    |

| `song\_id`    | uuid        |       No | None    |

| `notes`      | text        |       No | None    |

| `created\_at` | timestamptz |       No | `now()` |

| `updated\_at` | timestamptz |       No | `now()` |



## Ownership model



Personal notes are user-owned data.



The ownership relationship is based on:



`user\_id`



The notes themselves remain private to the user.



---



# 7. personal\_song\_preferences



The `personal\_song\_preferences` table stores personal song arrangement and preference information.



## Columns



| Column          | Type        | Nullable | Default             |

| --------------- | ----------- | -------: | ------------------- |

| `id`            | uuid        |       No | `gen\_random\_uuid()` |

| `song\_id`       | uuid        |       No | None                |

| `preferred\_key` | text        |      Yes | None                |

| `arrangement`   | text        |       No | `::text`            |

| `capo`          | integer     |      Yes | None                |

| `notes`         | text        |       No | `::text`            |

| `created\_at`    | timestamptz |       No | `now()`             |

| `updated\_at`    | timestamptz |       No | `now()`             |



## Important schema observation



Unlike `favorites` and `personal\_notes`, the current `personal\_song\_preferences` schema does not contain a `user\_id` column.



This is an important observation for future architecture and security review.



The current schema should not be modified during B2 simply to make it conform to the future architecture.



Before any future migration or schema change, the application's current implementation and RLS policies should be reviewed to determine exactly how ownership is currently enforced.



This is a migration-planning item, not an immediate production change.



---



# 8. recent\_songs



The Recent Songs feature has been permanently removed from the HIMIG product.



The `recent\_songs` table may still exist in the current Supabase database from the previous implementation.



However:



\* Recent Songs is no longer an active HIMIG feature.

\* It should not be represented as an active personal-data feature.

\* It should not be included in the future HIMIG product architecture.

\* No new frontend functionality should depend on it.



If the table is eventually removed from Supabase, that should be handled as a separate, deliberate database cleanup task after confirming that no remaining code, policies, or dependencies use it.



---



# Shared Data vs Personal Data



The current database can be divided into two major categories.



## Shared Team Data



These tables represent information shared within the current KCCC Psalmist environment:



\* `songs`

\* `setlists`

\* `setlist\_songs`



These are the primary candidates for future organization ownership.



## Personal User Data



These tables represent information associated with an individual user:



\* `favorites`

\* `personal\_notes`

\* `personal\_song\_preferences`



These should remain user-scoped in the future organization architecture.



---



# Current Ownership Model



The current database does not yet have an explicit organization ownership model.



The current structure relies on user references and the active application context.



Examples include:



```text

songs.created\_by

setlists.created\_by



favorites.user\_id

personal\_notes.user\_id

```



The absence of an explicit organization identifier means the database does not currently model independent organizations such as:



```text

Organization A

Organization B

Organization C

```



as separate database boundaries.



---



# Current Conceptual Relationships



The current shared-data relationship can be represented as:



```text

profiles

&#x20;  â”‚

&#x20;  â””â”€â”€ creates

&#x20;        â”‚

&#x20;        â”œâ”€â”€ songs

&#x20;        â”‚

&#x20;        â””â”€â”€ setlists

&#x20;                 â”‚

&#x20;                 â””â”€â”€ setlist\_songs

&#x20;                           â”‚

&#x20;                           â””â”€â”€ songs

```



Personal data is conceptually:



```text

profiles

&#x20;  â”‚

&#x20;  â”œâ”€â”€ favorites

&#x20;  â”‚      â””â”€â”€ songs

&#x20;  â”‚

&#x20;  â”œâ”€â”€ personal\_notes

&#x20;  â”‚      â””â”€â”€ songs

&#x20;  â”‚

&#x20;  â””â”€â”€ personal\_song\_preferences

&#x20;         â””â”€â”€ songs

```



---



# Current Organization Boundary



The current production implementation is effectively:



```text

HIMIG

â””â”€â”€ KCCC Psalmist

```



KCCC Psalmist is currently the active team/customer context.



There is no database table representing that organization yet.



Therefore, the current architecture is suitable for the existing single-organization implementation but is not yet a true multi-organization data model.



---



# Future Organization Direction



The future HIMIG architecture is intended to separate the HIMIG platform from the organization using it.



Conceptually:



```text

HIMIG Platform

â”‚

â”œâ”€â”€ Organization A

â”‚   â”œâ”€â”€ Members

â”‚   â”œâ”€â”€ Songs

â”‚   â”œâ”€â”€ Setlists

â”‚   â””â”€â”€ Setlist Songs

â”‚

â”œâ”€â”€ Organization B

â”‚   â”œâ”€â”€ Members

â”‚   â”œâ”€â”€ Songs

â”‚   â”œâ”€â”€ Setlists

â”‚   â””â”€â”€ Setlist Songs

â”‚

â””â”€â”€ Personal User Data

&#x20;   â”œâ”€â”€ Favorites

&#x20;   â”œâ”€â”€ Personal Notes

&#x20;   â””â”€â”€ Personal Song Preferences

```



A future implementation will likely require concepts such as:



```text

organizations

organization\_members

```



and organization ownership fields on organization-owned data.



The exact schema has not yet been finalized.



---



# Likely Future Organization-Owned Tables



The following current tables are expected to become organization-scoped:



```text

songs

setlists

setlist\_songs

```



The following are expected to remain user-scoped:



```text

favorites

personal\_notes

personal\_song\_preferences

```



This is an architectural direction, not a Phase B2 database migration.



---



# What Is NOT Being Changed in B2



Phase B2 is an inspection and documentation phase.



The following are intentionally unchanged:



\* Supabase tables

\* Supabase RLS policies

\* Authentication

\* Profiles

\* User roles

\* Song permissions

\* Setlist permissions

\* Setlist song permissions

\* Frontend code

\* Existing KCCC data

\* Existing personal data

\* Chord engine

\* Worship Mode

\* PWA/mobile functionality



No organization migration is being executed at this stage.



---



# Migration Principle



Any future move from the current KCCC-specific architecture to the multi-organization HIMIG architecture should be additive and backward-compatible where practical.



The goal is to preserve:



\* Existing users

\* Existing roles

\* Existing songs

\* Existing setlists

\* Existing setlist contents

\* Existing favorites

\* Existing personal notes

\* Existing personal song preferences



The future migration should introduce organization ownership without unnecessarily rebuilding working HIMIG functionality.



---



# Important Migration Questions



Before implementing the future organization architecture, the following should be resolved:



1\. How existing KCCC Psalmist users will be associated with the first organization.

2\. How existing songs will be assigned to that organization.

3\. How existing setlists will be assigned to that organization.

4\. How `setlist\_songs` organization context will be handled.

5\. How `personal\_song\_preferences` currently enforces user ownership.

6\. Whether `personal\_song\_preferences` requires a future `user\_id`.

7\. How existing RLS policies will transition to organization-aware policies.

8\. How organization membership will interact with the existing four roles.

9\. How organization isolation will be enforced at the database level.

10\. How the existing KCCC data can be migrated without disrupting the working application.



These questions belong to later architecture and migration phases.



---



# Relationship to Phase B1



Phase B1 established the conceptual boundary:



```text

HIMIG = Platform

KCCC Psalmist = Organization

```



Phase B2 maps that concept to the actual current database.



The key finding is:



> The current database does not yet explicitly represent the organization layer.



This is expected and is the primary reason for performing B2 before designing the future multi-organization migration.



---



# Phase B2 Status



## Completed



\* Actual `profiles` schema inspected

\* Actual `songs` schema inspected

\* Actual `setlists` schema inspected

\* Actual `setlist\_songs` schema inspected

\* Actual `favorites` schema inspected

\* Actual `personal\_notes` schema inspected

\* Actual `personal\_song\_preferences` schema inspected

\* Recent Songs confirmed as permanently removed from product scope

\* Shared vs personal data identified

\* Current organization boundary identified

\* Future organization migration direction identified

\* No production database changes performed



## Current conclusion



The existing HIMIG database is a functional single-organization architecture centered around KCCC Psalmist.



The future HIMIG product architecture will require an explicit organization and membership layer so that multiple churches or worship teams can use the same HIMIG platform while maintaining organization-level data isolation.



The next phase should focus on migration strategy rather than immediately modifying production tables.



---



# Phase B2 Complete



This document represents the current schema baseline for the HIMIG product as understood during Phase B2.



Future schema changes should be evaluated against this baseline before implementation.




