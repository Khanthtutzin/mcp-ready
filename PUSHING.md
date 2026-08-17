# Pushing to GitHub

Step by step, with a verification after each stage. Delete this file once the
repository is up.

Everything below runs from the repository root:

```bash
cd "C:/3. Projects/opensource-project"
```

---

## Step 1 — Confirm the local state is what you expect

Nothing is pushed yet. Check what one commit is about to become public:

```bash
git log --oneline
```

You should see exactly one commit, `feat: mcp-ready — MCP 2026-07-28 stateless migration checker`.

```bash
git status
```

Should report a clean tree on branch `main`. If it does not, commit or discard
before continuing — pushing a half-finished state is the one thing here that is
awkward to undo cleanly.

```bash
git ls-files | wc -l
```

89 files. `node_modules/` and `dist/` are excluded by `.gitignore`; that count
is source, tests, docs and config only.

## Step 2 — Confirm nothing secret is going public

This is the step worth not skipping. Once something is pushed to a public
repository it is in the clone history and in GitHub's caches, and deleting it
later does not reliably remove it.

```bash
git ls-files | grep -E '^(node_modules|dist)/|\.env|\.pem$|\.key$|id_rsa'
```

No output is the pass condition.

```bash
git grep -nIE '(ghp_|github_pat_|sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY)'
```

No output is the pass condition.

Both of these came back clean when the repository was prepared, but run them
yourself — you are the one publishing.

Finally, skim what a reader will actually see:

```bash
git ls-files
```

## Step 3 — Confirm the commit is attributed to you

```bash
git log -1 --format='%an <%ae>'
```

Should read `Khant Htut Zin <146423796+Khanthtutzin@users.noreply.github.com>`.
That is your GitHub noreply address, so the commit links to your account without
exposing a personal email.

## Step 4 — Verify everything still passes

Do not push a red build. CI will run these anyway, and a failing first commit
is a bad first impression on a repository whose whole pitch is rigour.

```bash
npm ci
```

```bash
npm run typecheck && npm run lint && npm run format:check && npm run docs:check && npm test && npm run build
```

Expect 43 passing tests and no other output of note.

## Step 5 — Create the repository on GitHub

Go to <https://github.com/new> and set:

- **Owner**: `Khanthtutzin`
- **Repository name**: `mcp-ready` — it must match, every URL in the project
  points at `github.com/Khanthtutzin/mcp-ready`
- **Description**: `Check whether an MCP server is ready for the 2026-07-28 stateless specification.`
- **Visibility**: **Public** — required for the Codex for Open Source program
- **Initialize this repository with**: **nothing at all.** Leave the README,
  `.gitignore` and license checkboxes unticked.

That last point matters. Ticking any of them creates a commit on GitHub's side,
which means your local `main` and the remote `main` have unrelated histories,
and the push in step 7 is rejected. Recovering from that needs a merge with
`--allow-unrelated-histories`, and you end up with a messy first two commits.
An empty repository avoids the whole problem.

Click **Create repository**. Ignore the setup instructions GitHub then shows —
they assume you have no commits yet. Use the steps below instead.

## Step 6 — Point your local repository at it

```bash
git remote add origin https://github.com/Khanthtutzin/mcp-ready.git
```

Verify:

```bash
git remote -v
```

Both lines should read `https://github.com/Khanthtutzin/mcp-ready.git`.

If you typed it wrong, fix it with `git remote set-url origin <correct-url>`
rather than adding a second remote.

## Step 7 — Dry run, then push

Check what would happen without doing it:

```bash
git push --dry-run -u origin main
```

You should see something like `* [new branch] main -> main` and no errors.

Then push for real:

```bash
git push -u origin main
```

**On authentication:** Git for Windows ships with Git Credential Manager, so
the first push opens a browser window to sign in to GitHub. Approve it and the
credentials are stored for next time. If you are instead prompted for a
username and password in the terminal, GitHub no longer accepts account
passwords — generate a
[personal access token](https://github.com/settings/tokens) with the `repo`
scope and paste that as the password.

Never paste a token into a command you run in a shared terminal or into a chat
window; let the credential manager or the password prompt take it.

## Step 8 — Verify what landed

```bash
git log --oneline origin/main
```

Then open <https://github.com/Khanthtutzin/mcp-ready> and check:

- The README renders, and the rule tables and links look right
- **Actions** tab: the CI workflow is running. It builds on Node 20/22/24 on
  Linux plus Windows and macOS, so give it a few minutes
- The CI badge at the top of the README turns green once that finishes
- **Insights → Community Standards** shows description, README, CoC,
  contributing, license and issue templates all present

If CI fails, read the log before changing anything — the most likely causes are
a Node version difference or a line-ending issue, and `.gitattributes` should
have handled the second.

## Step 9 — Repository settings

Continue with [SETUP.md](SETUP.md) from step 2: description, topics, private
vulnerability reporting, branch protection, then npm publishing and the first
batch of issues.

---

## If something goes wrong

**`error: remote origin already exists`** — you ran step 6 twice.
`git remote set-url origin https://github.com/Khanthtutzin/mcp-ready.git`

**`Updates were rejected because the remote contains work that you do not have locally`**
— you initialised the GitHub repository with a README or license. Easiest fix,
since your local history is the one you want: delete the repository on GitHub
(Settings → General → Danger Zone) and redo step 5 with nothing ticked.

**`Repository not found`** — usually an authentication failure rather than a
missing repository. Confirm you are signed in as `Khanthtutzin`, and that the
repository name matches exactly.

**Pushed something you did not mean to** — do not just delete the file in a new
commit; it stays in history. If it was a credential, treat it as compromised and
rotate it first. Then either delete and recreate the repository, or rewrite
history with `git filter-repo` and force-push.
