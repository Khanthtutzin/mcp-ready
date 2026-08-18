# Security Policy

## Supported versions

The latest minor release receives security fixes. `mcp-stateless` is pre-1.0, so
patches land on the newest version only.

## Reporting a vulnerability

Please report security issues privately through
[GitHub Security Advisories](https://github.com/Khanthtutzin/mcp-stateless/security/advisories/new)
rather than opening a public issue.

Include what the issue is, how to reproduce it, and what an attacker could do
with it. You can expect an initial response within seven days.

## Threat model

`mcp-stateless` is a diagnostic client. Two properties are worth stating because
they shape what counts as a vulnerability here:

**It executes what you tell it to.** `--stdio "<command>"` spawns a child
process. The command string is tokenized rather than passed to a shell, so
shell metacharacters are not interpreted — but the command still runs with your
privileges. Do not pass untrusted input to `--stdio`.

**It sends credentials you give it.** `--header "Authorization: ..."` is
transmitted to the `--http` target on every probe. Headers are recorded in the
run transcript, and `--verbose` and `--format json` print request payloads. The
transcript is held in memory only and is never written anywhere you did not
ask for — but be careful about pasting verbose output into a public issue.
Redact tokens first.

**Probing is not passive.** Rules deliberately call removed methods, send
malformed protocol versions, and request nonexistent resources. Against a
production server this is harmless but will appear in logs as a burst of
errors. It performs no writes and calls no tools.

## Out of scope

- Findings from running `mcp-stateless` against a server you do not control
- The behaviour of servers being probed
- Dependency vulnerabilities in devDependencies (the published package has zero
  runtime dependencies)
