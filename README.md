# Integration Flow Configuration
This README goes through all the clarifications of the project in order to understand it and make it easier for any user to deploy and/or change any code to the user's discretion.

## Set UP

### Requirements
The list of requirements can be seen in the file **requirements.txt** but include:
Node.js=v24.15.0
npm=11.12.1
Git=2.51.0
Docker=28.4.0
Docker_Compose=v2.39.2

# Database (Docker Compose)
PostgreSQL_image=postgres:16-alpine
Host_port=8080
Container_port=5432
Database=MaicellDB

# Backend (NestJS) — from backend/package.json
@nestjs/common=^11.0.1
@nestjs/config=^4.0.4
@nestjs/core=^11.0.1
@nestjs/typeorm=^11.0.3
typeorm=^0.3.27
pg=^8.22.0
class-validator=^0.15.1
class-transformer=^0.5.1
TypeScript=^5.7.3
Jest=^30.0.0
supertest=^7.0.0

# Frontend (Angular) — from frontend/package.json
@angular/core=^19.2.0
@angular/cli=^19.2.27
primeng=^19.1.4
@primeng/themes=^19.1.4
primeicons=^8.0.0
TypeScript_frontend=~5.7.2

Although you can see a demo of the actual service in:

In order to test it locally in your pc there are several steps that need to be followed.
### 1. Clone and configure environment

```bash
git clone https://github.com/celades5/Maicell.git
cd Maicell
```

Then create a root `.env` for Docker Compose so credentials are not hardcoded or committed. This repo already includes a **`.gitignore`** that ignores `.env` and other files.

```env
POSTGRES_USER=test
POSTGRES_PASSWORD=test
POSTGRES_DB=MaicellDB
POSTGRES_PORT=8080
```

Create `backend/.env` so Nest can reach that database:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=8080
DB_USERNAME=test
DB_PASSWORD=test
DB_DATABASE=MaicellDB
NODE_ENV=development
```

### 2. Start Docker & PostgreSQL

Once Step 1 is finished, from the repo root run **docker compose up -d** to start the Docker container. Wait until the container is healthy, this can be checked by `docker compose ps` or by a message from the used terminal mentioning the container is up and running. Host port **8080** maps to Postgres **5432** inside the container. To avoid clashes with other Projects, port 8080 has been used for this scenario. If you wish to change it, first stop the running container with `docker compose down`, update `root .env` port and then match it at the backend so Nest can connect. After start the container again and check is running in healthy mode. When that happens it will have a healthy postgres service using the image established in the `docker-compose.yml` in this case **postgres:16-alpine** which contains a small Linux environment with PostgreSQL 16 already installed and configured to start when the container boots. 

### 3. Install and run the backend

From the root folder `cd backend` and then run the following commands
```bash
npm install
npm run start:dev
```
in order to start the backend section. API listens on [http://localhost:3000](http://localhost:3000) with global prefix `/api` (for example `GET /api/flows`, `GET /api/component-definitions`).

A Swagger UI has been implemented to document and explore the API. It can be found at: [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

On starting the backend, it will read the components in `definitions/` (for example `challenge-library.json` and the `myesb-*Type.json` schemas). If those schemas live on a different path, set a **DEFINITIONS_DIR** variable in the environment (for example in `backend/.env`) so Nest can find them.

After xecuting the command to run the backend, first Nest will begin creating the app and wiring the modules. Will load the component schemas from the designated folder or the specified route as mentioned above and will list the endpoints under the `/api` prefix. After loading everything a healthy message shoudl be seen `Nest application successfully started +%ms`.

### 4. Install and run the frontend

Same as the previous step, in another terminal, run the following commands:

```bash
cd frontend
npm install
npm start
```
This will run the `ng serve --proxy-config proxy.conf.json` proxied to the Nest backedn defined in `proxy.conf.json` 

UI is at [http://localhost:4200](http://localhost:4200). Dev proxy forwards `/api` to `http://localhost:3000`. If port 4200 is already in use, `ng serve` may offer another port — prefer freeing 4200, because backend CORS is configured for `http://localhost:4200`.

## Database

### Why PostgreSQL

We use **PostgreSQL** as the persistence layer for this challenge because:

- It is production-like and matches how NestJS + TypeORM are commonly used in real systems.
- Unique flow names can be enforced with a database unique constraint (duplicate creates/updates map cleanly to a **409 Conflict**).
- Component configuration is stored as JSON; PostgreSQL supports this well (JSON/JSONB).
- TypeORM has solid first-class support for PostgreSQL.
- PostgreSQL is compatible with **TimescaleDB**, so the same stack can later support time-series workloads (e.g. flow run metrics, polling history) without changing the core database choice.

SQLite would be faster to start locally, but PostgreSQL better demonstrates constraints, JSON storage, and a realistic interview/evaluation setup.

### Why Docker

We run PostgreSQL with **Docker Compose** so that:

- Anyone can start the database with one command (`docker compose up -d`) without a local Postgres install.
- Credentials and ports stay consistent across machines via `docker-compose.yml`.
- The app stays portable: same DB version and config for development and review.
- The same Docker setup can be deployed with **Coolify** (self-hosted PaaS on Docker), using compose files such as `docker-compose.yml` / `docker-compose-coolify.yml` for hosting beyond local development.

## Tests

There are three groups of tests. Backend/frontend **unit** tests do not require `npm run start:dev` / `npm start`. Backend **e2e** needs PostgreSQL running (`docker compose up -d`).

### 1. Backend unit — `cd backend && npm test` (16 cases)

Does **not** need the API server or the UI.

**Component definitions**
- Exactly 4 whitelisted components
- Catalog labels/roles merge correctly
- Required flags, types, defaults, options
- Fields sorted by order
- Nested / advanced / beanreference excluded
- Results cached across getAll()

Second group of test is also in the backend path and can be executed with `npm run test:e2e`
**Flow validation**
- Valid example flow accepted
- Wrong role rejected 
- Missing required config rejected
- `file-uri` must start with `file:`
- Unknown component ids rejected
- Zero services allowed

**Flows service**
- Missing flow → `NotFoundException`
- Duplicate name DB error → `ConflictException` (409)
- Create succeeds after validation

**App controller**
- Root handler returns `"Hello World!"`

Filter examples:

```bash
npm test -- --testPathPatterns=component-definitions
npm test -- --testNamePattern="FlowValidationService"
```

### 2. Backend e2e — `cd backend && npm run test:e2e`

Needs Postgres up. Boots the Nest app inside the test process (you do not need a separate `start:dev` for these).

- Flows CRUD + **409** on duplicate name
- App smoke: `GET /` returns `Hello World!` (scaffold e2e; the running app’s public API uses the `/api` prefix)

### 3. Frontend — `cd frontend && npx ng test` (or `npm test`)

- App creates
- Sidebar links (“Flows”, “Create New Flow”)
- Definitions service `GET /component-definitions`
- Flows service CRUD HTTP verbs (mocked)
- Renders inputs from `configFields`


## Assumptions
Several assumptions have been made for this challenge. First, **no authorization** is handled, single trusted local/demo user, the API is open. There is also no visual or diagram of a flow editor, a single UI is presented. 

Configure flows only, there is no runtime execution of consumers / services / producers. The app is able to let the user choose **names, components, config fields** and save that to the DB chosen. The model lets the user have 1 consumer + 0+ services + 1 producer.

A flow has three parts:

1 consumer (always first conceptually — Scheduler)
0+ services (the middle pipeline)
1 producer (always last — File Drop)
Only the middle services get an order number.

Position in services[]	Stored as
first service
order: 0
second service
order: 1
third service
order: 2
So if you save:

Consumer: Scheduler
Services: [File Reader, XML→JSON]
Producer: File Drop
the DB has two flow_steps rows for that one flow:

File Reader → order = 0
XML→JSON → order = 1
If you swap them:

Services: [XML→JSON, File Reader]
you get:

XML→JSON → order = 0
File Reader → order = 1
Same components, different pipeline: read-then-transform vs transform-then-read.

The flow itself doesn’t have an “order” field. Order is “step 1, step 2, …” inside that flow’s service list. Consumer and producer don’t use order — they’re fixed slots on the flows row.

Why the catalog is in memory
Two different kinds of data:

Data	Where	Why
Flows (what the user builds)
PostgreSQL
Created/edited/deleted at runtime; must persist
Component catalog (what’s allowed + form fields)
JSON files → loaded once into Nest memory
Challenge definitions are static; not user-editable via the UI
“In memory” means: when Nest starts, it reads the JSON files once, builds the 4 definitions, and stores them in a private array on ComponentDefinitionsService. After that, every GET /api/component-definitions returns that array — no disk read, no DB query on each request.

Why that design for this challenge:

The catalog doesn’t change while the app runs (only if you edit the JSON files yourself).
Merging library + Type schemas once at startup is simple and fast.
You avoid inventing catalog tables/migrations for something that already ships as files.
Validation and the UI both reuse the same cached definitions.
Trade-off: change a JSON file → restart Nest so it reloads. If the catalog lived in Postgres, you could update rows without restart — but that’s more complexity than this MVP needs.











Host DB port is 8080 to avoid clashing with 5432 port in other projects that may go running at the same time. Only the four components given for the challenge are allowed in the app, the other components in the **challenge-library.json** such as Kafka, OAuth,... are ignored by Nest. Deleting flows as action removes the row from the DB, allowing then to create a new flow with the same name as the one that has been deleted. Since file location is a **URI** OS paths that are not in URI form are not allowed and will return a 400 error. Even though the **File Reader** description allows the URI starting with `classpath:` the challenge only allows for paths starting with `file:` for the pipeline to work for File Reader and File Drop directory.

A form of catalog is built by merging **two file types**: `challenge-library.json` holds identity for each component (**id**, display **name/label**, **description**, **category**), while each `definitions/myesb-*Type.json` (for example `myesb-cron-consumerType.json`) holds the **form/config schema** (field keys, labels, required/optional, types, defaults, options). At startup, Nest takes the **4 whitelisted** ids, joins each library entry with its matching Type schema into one normalised definition, and keeps the result in memory. Later, `GET /api/component-definitions` reuses that cache.

An MVP approach has been followed in order to complete the challenge. Despite the schemas of the components being very large, to complete the challenge forms and validations are restricted to the necessary criteria of the challenge. Nested sequence fields, advanced fields, and beanreference fields, and keep required scalars such as id, file-uri, return-type, directory, cron, and similar simple options.

By using Docker Compose, it starts the database container. Nest and Angular run on the machine with `npm` command. **Important:**
- Two flows cannot both be named ``<NAME>``. This will trigger an 409 error.
- Two flows can both have the same consumer config id.
- A flow can be named ``<NAME>`` and also have a component config id with said ``<NAME>`` if desired since the are different fields, although is not recommended.
- Only the flow name is uniqueness-checked.

The files `.env` contain the users and passwords used for the challenge so Docker Postgres and Nest match. They are not production ready for its simplicity.


Several things have been added in order to simulate a production integration flow like the checked message to `Delete after reading / autostart` since they are a Type.json metadata located in the definitions files, they have no runtime effect.

The UI shows catalog labels (e.g. Scheduler, File Drop); the database and API persist the ids (e.g. myesb-cron-consumer, myesb-file-producer).

In local development, Nest allows CORS from http://localhost:4200, and the Angular app calls /api through the ng serve proxy to http://localhost:3000.

TypeORM synchronize is enabled in development so tables follow entity changes automatically; it is disabled when NODE_ENV=production. On each backend start, TypeORM compares the entities to the DB and tries to match them: create missing tables/columns, alter types when it can, drop columns that no longer exist on the entity, etc.


The app **does not:**

- run the cron on a schedule
- read files from disk when the schedule fires
- transform XML→JSON.
- drop files into an output folder
- talk to a live ConnectPlaza/ESB engine
- Have **no** consumer/producer or more than one
- Services without the required consumer/producer pair won't run

 
## Interpretation and use of the component definitions

The ConnectPlaza files are treated as a static catalog, not as a running ESB.

Two sources, one definition
File	Role
challenge-library.json
Identity: id, display name, description, category, and which index it belongs to (consumer / service / producer)
myesb-*Type.json
Form schema: field keys, labels, required/optional (use), types (appinfo.fieldType), defaults, enumerations, display order
At Nest startup, only the four challenge components are taken from the library (Scheduler, File Reader, XML→JSON, File Drop). Each is joined with its matching *Type.json into one normalised shape:

id, name, description, category, role, configFields[]

That list is cached in memory and exposed as GET /api/component-definitions. Kafka, OAuth, and other library entries are ignored.

How fields were interpreted
Each Type.json entry is mapped to a UI/validation field when it is useful for the challenge:

use: "required" → required in forms and on create/update
appinfo.label / description → labels and help text
appinfo.fieldType → input kind (string, boolean, cron, enumeration, …)
appinfo.defaultValue / enumeration → defaults and dropdown options
order → field order in the form
Excluded for MVP (schemas are large and ConnectPlaza-specific):

nested sequence blocks
advanced fields
beanreference fields
Kept: simple scalars needed for a valid config pipeline (id, cron / cron-expression, file-uri, return-type, directory, and similar options such as autostart / delete-after-reading).

How the app uses them
Angular — loads definitions and builds dynamic config forms from configFields (no hardcoded field lists per component). The UI shows catalog labels (e.g. Scheduler); the API/DB store ids (e.g. myesb-cron-consumer).
Backend validation — on create/update, checks whitelist id, role match (consumer/service/producer), required fields, and basic types against the same definitions. Extra domain rule: file-uri and producer directory must start with file: (even though ConnectPlaza also mentions classpath:).
Not a runtime engine — definitions describe what can be configured, not what executes. Saving a flow persists config; it does not schedule cron, read files, or transform XML.
Design choice
Definitions stay file-backed + in-memory because they are static challenge assets. Flows (user data) live in PostgreSQL. Changing a JSON file requires a Nest restart so the cache reloads.

That answers the evaluator’s question in three moves: interpreted as catalog + form schema, simplified for MVP, wired into UI + validation, not execution. If you want, I can paste this into the empty README section and tighten it to match your Assumptions tone.

1. Roles enforced (wrong role → 400)
Each component id has a fixed role in the whitelist:

myesb-cron-consumer → consumer
myesb-filereader-service / myesb-xml2json-transformer → service
myesb-file-producer → producer
When you save a flow, the backend checks not only “is this id allowed?”, but also “is it in the right slot?”. If you put File Drop in the consumer slot, validation fails with 400 and a message like “myesb-file-producer is a producer, but consumer requires a consumer”.

That prevents invalid pipeline shapes such as “producer as consumer” or “Scheduler as a middle service step”.


 No Duplicate / View-only flow actions
The UI only offers Edit and Delete per row. There is no:

View mode (read-only detail without edit controls)
Duplicate action (clone an existing flow under a new name)


## Validation


## simplified, stubbed, or left unfinished




## Improvements

“We didn’t put the whole stack in Docker” — what’s missing?
Docker today ≈ Postgres only.

Not containerized for daily work:

Nest backend
Angular frontend
(optional) one-command docker compose up for API + UI + DB
You run those with npm on the host instead. Fine for the challenge; full Docker would be for “clone and run everything with zero Node install.”


That is OK for a homework/demo on your machine.
It is not OK as the password on a public internet server — there you’d use strong secrets from the host (Railway env vars, etc.) and never commit them.

Authorization

Endpoints


## AI Tools
 AI tools such as Cursor has benn used for the challenge. AI has designed the test based on the clarification that they needed to be focused in



•	how validation is handled;
•	what was simplified, stubbed, or left unfinished;
•	what you would improve with more time;
•	whether and how you used AI tools.
