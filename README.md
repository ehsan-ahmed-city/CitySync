# CitySync
My individual project CitySync is an intelligent student planner
Ehsan Ahmed
Email: ehsan.ahmed@city.ac.uk
Student id:220000786
Consultant: Dr Panos Giannopoulos

## My stack

Backend: Spring Boot, PostgreSQL and Java
For mobile: Expo, react native and Typescript
External APIs and services: Google Routes API, GMAIL SMTP (email server)

## Sturcture

/backend for Spring Boot API

/mobile for Expo mobile App

## Postgre sql setup

Create a postgresql database called citysync

These are the local database settings I use:
spring.datasource.url=jdbc:postgresql://localhost:5432/citysync

spring.datasource.username=postgres

spring.datasource.password=postgres

## Importing the schema

After creating the citysync db, import the SQL schema file included in the project, it should be in the same directory as this readMe:
C:\Users\whatever\CitySync\CitySync

If you're using pgAdmin4 then:
1. Open pgAdmin
2. Create the citysync database
3. Open the query tool for CitySync
4. copy and paste the contents of the sql file
5. Run it

If your using psql, run:
cd C:\Users\whatever\year3\CitySync\CitySync
psql -U postgres -d citysync -f CitySync_Schema.sql

or do full path: psql -U postgres -d citysync -f "C:\Users\whatever\CitySync\CitySync\CitySync_Schema.sql"

The schema won't contain and user data, it'll create the required tables and contain that and the relationships/constraints.

## Setting up google Routes API

CitySync use google routes api for travel time calculations. The backend should read the API key from GOOGLE_ROUTES_KEY

To set up the API key:

1. Create a google cloud project
2. You have to setup and enable billing for the project
3. Enable the routes API
4. Create an API key
5. Restrict the key

Restricting the API key

Citysync calls google routes from the backend so the best set up is to restrict the key by:
API restricted to Routes API only (there's a bunch to choose from but I only used Routes)

I set up the environment variables in the edit configuration tab in my IDE, it should be:
GOOGLE_ROUTES_KEY = whatever your key is

## Gmail SMTP setup

CitySync uses gmail SMTP for sending emails with verification codes, the backend expects MAIL_USER and MAIL_PASS

Backend should have:
host:smtp.gmail.com
port: 587
authentication enabled
STARTTLS enabled

Gmail supports the smtp on these settings

I one of my gmails, you can use any gmail you want.
To set it up if your account has 2 step verification then use an app password for SMTP instead of your normal password.

Again, I edited the run configurations in my IDE it should be
MAIL_USER= your gmail
MAIL_PASS = the app password

## Backend setup and run

If you run from an IDE then you can just open the backend and run BackendApplication.java.

Else:
Open power and have it in the project directory and then: cd .\backend
Then run Maven wrapper so it can be run in case you don't have maven installed on your pc
.\mvnw.cmd spring-boot:run

The backend defgault port is on http://localhost:8080

## Mobile setup

Open a powershell window and change directory to this:
cd C:\Users\whatever\CitySync\CitySync\mobile

Expo commands run in the mobile folder

After that cd then install the dependencies with:
npm install

After that run:
npx expo start

You should get a QR code in powershell

Make sure you have Expo Go installed on your phone.
Make sure your pc and phone is on the same network otherwise it won't run
After you have Expo go installed then open your phone camera and point it at the QR code, it hsould prompt you to open it in Expo Go

I know the QR prompt appears on iPhone, I'm not sure about android  but the QR scan should work on android 

## Local config

The app uses a hardcoded backend URL in const API_BASE = "http://192.168.0.12:8080";
Once you get your IP add colons and the 8080 port like: "http://IP.168.x.y:8080"

and go into C:\Users\whatever\CitySync\CitySync\mobile\lib\api.ts and change the value of API_BASE to that.

## Make sure the env variables are set
If you're not doing it on an IDE like me, then go on powershell and cd to this:
C:\Users\whatever\CitySync\CitySync\backend
and set:

$env:GOOGLE_ROUTES_KEY="your_routes_api_key"

$env:MAIL_USER="your@gmail.com"

$env:MAIL_PASS="your_app_password"

## Starting up order

Again, if your running from an IDE then you can just open C:\Users\whatever\CitySync\CitySync\backend\src\main\java\com\citysync\backend and run BackendApplication.java.

Else open power and have it in the project directory and then: cd .\backend

$env:GOOGLE_ROUTES_KEY="your_routes_api_key"

$env:MAIL_USER="your@gmail.com"

$env:MAIL_PASS="your_app_password"

.\mvnw.cmd spring-boot:run

in another terminal for mobile:

cd .\mobile

npm install

npx expo start