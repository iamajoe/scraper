# scrape

> Scrape API

==========

## Documentation

You can access the documentation at [docs/README.md](docs/README.md).

==========

## Development

### Install

1. Install [Node.js](https://nodejs.org)
2. On the CLI, on the project folder run `npm install`

### Run

To start this project run

```bash
npm run build && npm run start
```

#### Run documentation

```bash
npm run start:docs
```

#### Run connected to production db

```bash
NODE_ENV="production" DB_HOST="<host>" npm run start
```

### DB tunnel

To interact directly with the production DB, we need to tunnel through an AWS instance and only then we can connect to the mongo database

```bash
/bin/bash scripts/tunnel.sh <ssh-pem>
# under "production.json" you need to change the "_dbWithTunnel" to be the "db"
ENV=production NODE_ENV=production npm run start
```

### Backup

To backup run

```bash
/bin/bash scripts/backup.sh <db-password> <ssh-pem>
```

The file will be saved on the working directory with the date of the day.

### Guide

#### Working with the config

At [config](config) you'll find various files. All these have exactly the names that are used with a specific environment variable in mind.

[default.json](config/default.json) is the first file imported and as per name has all the defaults of the application. After loading this file, the system will load the file with the name of the `NODE_ENV`. If you have `NODE_ENV=production` then `production.json` will be loaded on top of the default configuration.

### Optional environment variables

```
NODE_ENV='development'|'testing'|'production'
DISABLE_NOTIFICATIONS=true                           # disables notifications from going out
LOG_NOTIFICATIONS=true                               # log the notifications (DISABLE_NOTIFICATIONS doesn't collude)
LOG_SET_ROUTES=true                                  # logs set routes on start
```
