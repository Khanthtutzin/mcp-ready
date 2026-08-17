# fakebin

Fixtures for `test/spawn-plan.test.ts`.

npm installs `npx`, `npx.cmd` and `npx.ps1` into the same directory. Windows
runs the `.cmd`; a naive bare-name PATH lookup finds the extensionless POSIX
shell script instead, and `spawn` then fails with ENOENT.

These two files reproduce that layout so the resolution ordering stays covered.
Neither is ever executed.
