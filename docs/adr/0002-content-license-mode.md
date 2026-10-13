# ADR 0002: Content license mode

**Status:** accepted. **Context:** the handbook is copyrighted; only SRD 5.1 may be redistributed.
**Decision:** every content row carries `source`; env `CONTENT_LICENSE_MODE` (`FULL` | `SRD_ONLY`) filters non-SRD rows from public views.
**Consequences:** default is `FULL` for private use; a public deployment must set `SRD_ONLY` and omit extracted non-SRD data.
