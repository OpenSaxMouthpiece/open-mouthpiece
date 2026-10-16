# Working on changes: branches, worktrees, checks

How changes move through this repo. The short version: one task, one branch or one clean commit.

## Branches

- `master` is the live site: every push redeploys it. Nobody commits to it directly.
- `dev` is what is ready to be seen on the dev site (https://dev.opensaxmouthpiece.org/). Small, approved
  changes are committed straight to it, one commit per task.
- A bigger or unapproved feature gets its own branch (`rail-clip`, ...) and stays off `dev` until it is
  approved. Do not leave a half-finished feature as uncommitted changes in the shared folder: the next task
  then mixes into it and nothing can be committed on its own.

## A feature in its own folder (git worktree)

```
node scripts/worktree.mjs rail-clip          # ../open-mouthpiece-rail-clip on a new branch from dev
cd ../open-mouthpiece-rail-clip
npx vite --port 5182 --strictPort            # its own app, its own browser storage
node scripts/worktree.mjs --remove rail-clip # when it is merged (the branch stays until deleted)
```

The script copies the downloaded OpenSCAD (`public/openscad/`), any small local-only files, and runs
`npm install`. Each worktree has its own working files, so two features never share a half-edited file.

## Checks

| Change | Run |
| --- | --- |
| Geometry or parameters | `npm run check` (about 2 min; `-- --update` after an intended change), `npm run sweep -- --only <regex>` for new clamps |
| App code | `npm run lint`, `npm run format:check`, `npm test`, `npm run build` |
| Docs or labels | `npm run format:check` |

`npm run check` also measures the mesh itself (length, symmetry, facing against the generator's FACING
lines, rail widths, tip opening): `scripts/geometry_check.mjs`.

## Merging and going live

1. On the feature branch: `git rebase dev`, then rerun the checks above.
2. `git switch dev && git merge --ff-only <branch>`, push, then `npm run build && npx wrangler@3 deploy --env dev`.
3. To go live, when the maintainer says so: `git switch master && git merge --ff-only dev && git push origin master`, then back to `dev`.

Commit messages are short and general; everything committed is public at once.
