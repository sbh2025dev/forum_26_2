# Forum lecture

A small Express and EJS app using a local MongoDB database.

## Start the app in the devcontainer

Choose **Dev Containers: Rebuild Container** in the VS Code Command Palette
once to apply this configuration. Opening the project in the devcontainer starts
the Node.js development container, MongoDB, and Mongo Express together.
Dependencies are installed when the devcontainer is created.

Compose waits for MongoDB's health check before starting the Node.js container.
The app connects directly to `mongodb://mongodb:27017` on the shared Docker
network. No host gateway is needed.

In the devcontainer terminal, run:

```sh
npm start
```

`npm start` uses Node.js watch mode to restart automatically when `server.js`
or its imported modules change. Refresh the browser to see updates; EJS templates
and static files are read on requests and do not require a server restart.
Open http://localhost:8080; VS Code forwards this port from the devcontainer.

Posts are stored in the `posts` collection in the `forum` database. The existing
`mongo-data` volume keeps them across restarts and container rebuilds. Avoid
`docker compose down -v` unless you intend to delete the database.
Closing the devcontainer stops the Compose services.

The base `compose.yaml` defines the database services; `.devcontainer/compose.yaml`
adds the Node.js container. Bind mount paths in the override are relative to the
base Compose file, so the project folder is mounted at `/workspace`.
See the [VS Code multi-container documentation](https://code.visualstudio.com/docs/devcontainers/create-dev-container)
and [Compose startup order documentation](https://docs.docker.com/compose/how-tos/startup-order/).

## Browse the database

With the devcontainer open, visit http://localhost:8082. Mongo Express lets you
view and edit MongoDB documents directly in the browser, with no login for this
local lecture setup.

Select the `forum` database, then the `posts` collection. If they do not appear
yet, publish a post in the app first, then refresh Mongo Express.
Changes here affect the same database used by Express; refresh the app to see them.

The browser interface is bound to your computer's loopback address.
See the [Mongo Express documentation](https://github.com/mongo-express/mongo-express).

## Run the app without a devcontainer

In a terminal on your computer, open this project folder and run:

```sh
docker compose up -d
npm install
npm start
```

The base Compose file starts only MongoDB and Mongo Express. MongoDB publishes
port 27017 for local access, and Express defaults to `mongodb://127.0.0.1:27017`.
This unauthenticated database is intended for local lecture development on a
trusted machine. If MongoDB is already installed and running locally, you can
skip Docker. To use another address, set `MONGODB_URI` before starting the app.

To stop the database services, run `docker compose down` from the same host terminal.

## Follow the code

- `client.connect()` connects before the web server starts.
- `posts.find().sort(...).toArray()` reads the newest posts first.
- `posts.insertOne(...)` saves a post and generates its `_id`.
- `posts.deleteOne(...)` deletes a post by its MongoDB `ObjectId`.

See the [MongoDB Node.js driver documentation](https://www.mongodb.com/docs/drivers/node/current/crud/insert/).
