# Contributing

## Git hooks
We run a fast unit test suite on **pre-push**.

- Normal push runs: `pnpm run test:fast`
- CI and full runs use: `pnpm run test:ci`
- Bypass once (only if really needed): `git push --no-verify`