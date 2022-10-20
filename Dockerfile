FROM docker.io/library/node:16
COPY ./img /img
COPY ./config.json /
COPY ./index.js /
COPY ./package.json /
COPY ./package-lock.json /
RUN npm install
CMD ["/usr/local/bin/npm", "start"]