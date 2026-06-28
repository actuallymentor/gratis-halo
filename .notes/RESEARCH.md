# Research Notes

Load when updating planning/spec/deployment documentation for Halo.

- Oura OAuth should use server-side authorization-code flow. Browser-only implicit flow has no refresh token.
- Halo needs Oura `email` scope for stable account identity because Oura is the only login system in v1.
- Oura redirect URIs must be registered exactly, including localhost.
- Oura V2 sleep documents expose `average_hrv` and `hrv.items`; max HRV must be derived.
- PVT v1 decision: 3-minute PVT-B style test for adherence, within-person trends only.
- HRV z-score thresholds of 1.0/1.5/2.0 are reasonable first-version bands but should be constants, not hidden UI literals.
