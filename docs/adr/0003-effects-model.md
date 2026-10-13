# ADR 0003: Effects model for rules automation

**Status:** accepted. **Context:** traits, features, feats, spells and conditions all modify numbers.
**Decision:** model each as an Effect folded by a pure `derive()` in `engine/`, returning a breakdown; complex features use registered handlers; every feature has an automation tier (full/assisted/manual).
**Consequences:** UI never computes rules; the DM can always override.
