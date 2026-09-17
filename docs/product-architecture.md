# HIMIG — Product Architecture



## Phase B1 — Platform vs Organization Boundary



## 1. Purpose



This document defines the conceptual boundary between the HIMIG platform and the worship organization currently using it.



The current production implementation is built for KCCC Psalmist.



The purpose of this document is to establish a future architecture in which HIMIG can support multiple churches or worship organizations without treating KCCC Psalmist-specific information as part of the core HIMIG platform.



This is a planning document.



It does not change the current database, authentication system, application code, RLS policies, or production data.



---



# 2. Product Concept



HIMIG is the platform.



A church, worship ministry, or worship organization is a customer or organization using the platform.



The conceptual relationship is:



```text

HIMIG Platform

&#x20;     │

&#x20;     ├── Organization A

&#x20;     │

&#x20;     ├── Organization B

&#x20;     │

&#x20;     └── Organization C


