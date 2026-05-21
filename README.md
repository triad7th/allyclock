# AllyClock

AllyClock is a multi-app repository. The current production app is the Angular Web app in `apps/web`.

## Web App

Install Web dependencies:

```sh
npm --prefix apps/web ci
```

Run the Web app locally:

```sh
npm run start:web
```

Build the Web app:

```sh
npm run build:web
```

Run Web unit tests:

```sh
npm run test:web
```

The Web production build is emitted under `apps/web/dist/allyclock/browser`.

## Deployment

GitHub Actions builds `apps/web` and deploys the browser output to Netlify.
