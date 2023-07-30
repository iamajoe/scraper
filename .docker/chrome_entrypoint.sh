#!/bin/bash

CHROME_PORT="${CHROME_PORT:=9222}"
CHROME_CLI="${CHROME_CLI:=google-chrome-stable}"

"$CHROME_CLI" --headless --disable-gpu --remote-debugging-address=0.0.0.0 --remote-debugging-port=$CHROME_PORT "about:blank"
# --hide-scrollbars --blink-settings=imagesEnabled=false --window-size=800,600 --disable-extensions --disable-gpu --disable-default-apps --disable-crash-reporter --disable-notifications --disable-remote-fonts --disable-smooth-scrolling --disable-search-geolocation-disclosure --disable-prompt-on-repost --proxy-server='direct://' --allow-insecure-localhost
