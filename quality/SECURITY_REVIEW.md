# Security Review Checklist

- [ ] Threat model current.
- [ ] No path traversal.
- [ ] No symlink/junction escape.
- [ ] No arbitrary module scripts.
- [ ] Child processes use structured args.
- [ ] Secrets redacted.
- [ ] State/lock corruption fails closed.
- [ ] Concurrent mutation protected.
- [ ] Rollback recovery data safe.
- [ ] npm package contents audited.
- [ ] Dependencies/licenses reviewed.
- [ ] Generated auth trusted-origin/cookie/session behavior tested.
- [ ] Server authorization exists for every protected admin action.
- [ ] Example credentials are synthetic.
- [ ] SECURITY.md ready.
