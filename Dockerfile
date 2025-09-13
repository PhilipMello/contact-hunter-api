# AtomyCloud - ContactHunter Docker Container Image | atomycloud/contacthunter:0.1
# IMAGE: Ubuntu 24.04.2 LTS + Node.js 18.x + PM2 + Contact Hunter API
# VERSION: 0.1
# DESCRIPTION: Docker container image for Contact Hunter API
# A powerful tool to find all contact details.
# URL: https://github.com/PhilipMello/contact-hunter-api
# AUTHOR: Philip Mello - philip@atomy.cloud
# docker run -d -p 3000:3000 atomycloud/contacthunter:0.1

FROM ubuntu:24.04

WORKDIR /app

COPY . .

RUN apt update && apt upgrade -y && \
    echo "Europe/Lisbon" > /etc/timezone && \
    apt install -y \
    curl \
    libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 \
    libcups2t64 libdrm2 libgbm1 libgtk-3-0t64 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
    libpangocairo-1.0-0 libpangoft2-1.0-0 && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs && \
    npm install -g pm2  && \
    npm install && \
    rm -rf /var/lib/apt/lists/* && \
    echo "API_KEY=000111" >> .env

EXPOSE 3000

ENTRYPOINT [ "pm2-runtime", "start", "app.js", "--name", "contacthunter", "&&", "pm2", "save", "&&", "pm2", "startup" ]
