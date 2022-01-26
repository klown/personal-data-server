# Personal Data Server

Personal Data Server can be used to save, retrieve, update and delete personal user data. This project is written in
[`node.js`](https://nodejs.org/en/) and uses [`Postgres`](https://www.postgresql.org/) as the backend database.

This project supports these authentication methods:

* Google Single Sign-on

## Getting Started

To work on the project, you need to:

* Install [NodeJS and NPM](https://nodejs.org/en/download/) for your operating system
* Clone the project from GitHub. [Create a fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)
with your GitHub account, then run the following in your command line (make sure to replace `your-username` with
your username):

```bash
git clone https://github.com/your-username/preferencesServer
```

* Obtain Google OAuth 2.0 client credentials from the [Google API Console](https://console.developers.google.com/)
* From the root of the cloned project, run commands below to create `dataModel/SsoProvidersData.sql`

```bash
cp dataModel/SsoProvidersData.sql.example dataModel/SsoProvidersData.sql
```

* Edit `dataModel/SsoProvidersData.sql` to replace the string value at the line 17 and 18 with Google OAuth 2.0 client id
and client secret. This SQL file will be loaded into the database later

* Run the command below to start the server

```bash
npm start
```

* Open `http://localhost:3000/` in a browser demonstrates a process of Google Single Sign-on

## Development

### Lint

Run the command below to lint Javascript, CSS, markdown JSON and JSON5 files in this project:

```bash
npm run lint
```

### Automated Tests

Run the command below to run all tests in this project:

```bash
npm test
```

### Helper Scripts

The [`/scripts`](./scripts) folder has helper scripts for performing individual actions on the backend database including:

* Start/stop the Postgres docker container
* Load data into the database in the Postgres docker container
* Drop the database in the Postgres docker container

The documentation for helper scripts can be found in the [`/doc`](./docs/HelperScripts.md) folder.
