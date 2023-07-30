FROM --platform=linux/amd64 debian:buster-slim

# Install deps + add Chrome Stable + purge all the things
RUN apt-get update
RUN apt-get install -y \
	apt-transport-https \
	ca-certificates \
	curl \
	gnupg \
	--no-install-recommends
RUN curl -sSL https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/chrome.list
# RUN echo "deb https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
RUN apt-get update
RUN apt-cache search chrome
RUN apt-get install -y \
	google-chrome-stable \
	fontconfig \
	--no-install-recommends
RUN apt-get purge --auto-remove -y curl gnupg \
	&& rm -rf /var/lib/apt/lists/*

# Add Chrome as a user
RUN groupadd -r chrome && useradd -r -g chrome -G audio,video chrome \
	&& mkdir -p /home/chrome && chown -R chrome:chrome /home/chrome

COPY chrome_entrypoint.sh /app/entrypoint.sh
RUN chmod 777 /app/entrypoint.sh

# Run Chrome non-privileged
USER chrome

ENV CHROME_CLI="google-chrome-stable"
ENV CHROME_PORT=9222

ENTRYPOINT ["/app/entrypoint.sh"]
