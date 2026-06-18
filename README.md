# Project Navigator — Web Prototype

A responsive, static-data prototype for an AI-powered education and career
guidance service.

## Run locally

PowerShell script execution is restricted on this PC, so use the `.cmd`
executables:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

Then open `http://127.0.0.1:5173`.

## Prototype flow

- Use **Use demo account** on the login screen.
- New signup users receive the three-step onboarding flow.
- Explore dashboard recommendations, program filters and program details.
- Open **My roadmap** and click task circles to update progress.
- Session, onboarding and mock account data are stored in browser local storage.

## Mock data

- `src/data/programs.json`
- `src/data/roadmap.json`

The UI imports these through typed domain models, making a later API
replacement straightforward.

## Checks

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run lint
& 'C:\Program Files\nodejs\npm.cmd' run build
```
