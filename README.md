# Scraper

## Install dependencies

### Running with chrome

#### Docker

```bash
docker-compose up
```

##### Mac

There is a [known issue](https://github.com/docker/for-mac/issues/5766) that doesn't let the docker run on an arm based Mac. As such, I recommend to run the `.docker/entrypoint.sh` without virtualization instead of using the docker.

For example:

```bash
CHROME_CLI="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" CHROME_PORT=9222 /bin/bash .docker/chrome_entrypoint.sh
```

## Usage

TODO: setup an example of usage
