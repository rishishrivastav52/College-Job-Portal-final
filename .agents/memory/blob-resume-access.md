---
name: Private resume storage
description: How the recruiting portal serves resume files from a private Vercel Blob store.
---

Resume files should be stored as private Vercel Blob objects and read through an authenticated API proxy rather than exposing blob URLs directly.

**Why:** The configured Vercel Blob store is private, so public uploads fail and recruiter access must be authorized against the application owner or the job's company.

**How to apply:** Keep the database value as the blob pathname, return an application resume endpoint to clients, and stream the file only after checking the signed session and ownership.