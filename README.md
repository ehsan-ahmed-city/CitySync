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

### create database 
psql -U postgres

Create DATABASE citysync;

\q

or you can do :

psql -U postgres -c "CREATE DATABASE citysync;"

## setting up environment variables

$env:GOOGLE_ROUTES_KEY="yourroutes_api_key"

$env:MAIL_USER="you@gmail.com"

$env:MAIL_PASS="your_app_password"

### Importing the schema
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
5. Restrict the key to routes api only

## Gmail SMTP setup/app password

CitySync uses gmail SMTP for sending emails with verification codes, the backend expects MAIL_USER and MAIL_PASS

Host: smtp.gmail.com

port: 587

Use app password (not your real one)


enable 2FA on your gmail

Gneerate app password

use it as Mail_PASS in the environment variables step (scroll up)


## Backend setup and run

cd backend

./mvnw spring-boot:run   # mac/linux

.\mvnw.cmd spring-boot:run  # windows

The backend defgault port is on http://localhost:8080

## Mobile setup

Open a powershell window and change directory to this:

cd C:\Users\whatever\CitySync\CitySync

cd mobile

npm install

npx expo start

## Local config

### Get your local IP:
ipconfig for windows
ifconfig for mac

The app uses a hardcoded backend URL in const API_BASE = "http://192.168.0.12:8080;"

Once you get your IP add colons and the 8080 port like: "http://IP.168.x.y:8080;"

and go into C:\Users\whatever\CitySync\CitySync\mobile\lib\api.ts and change the value of API_BASE to that.



## Make sure the env variables are set
If you're not doing it on an IDE like me, then go on powershell and cd to this:
C:\Users\whatever\CitySync\CitySync\backend
and set:

$env:GOOGLE_ROUTES_KEY="your_routes_api_key"

$env:MAIL_USER="your@gmail.com"

$env:MAIL_PASS="your_app_password"

## Starting up order

### first terminal
Again, if your running from an IDE then you can just open C:\Users\whatever\CitySync\CitySync\backend\src\main\java\com\citysync\backend and run BackendApplication.java.

Else open power and have it in the project directory and then: cd .\backend

set your environment variables

.\mvnw.cmd spring-boot:run

### in another terminal for the mobile app:

cd .\mobile

npm install

npx expo start

## Using and testing CitySync

### First time running the app

1. Open the app and you'll see the login screen
2. Enter your city email and tap the send code button
3. Check your email for the 6 digit code and enter it
4. You'll remain logged in as your session persists, you won't need to login again unless you logout

### Setting up your timetable

1. Subscribe to your myTimetable ICS in your device calendar (such as Apple calendar), this done once via: https://mytimetable.city.ac.uk/help
2. In CitySync go to the calendar picker tab (3rd tab) and select your city timetable calendar.
3. Save selection on the top

### Setting up travel

1. Go to settings tab (4th tab)
2. enter your home address
3. set your leave buffer (which is the extra time you get before your lecture/tutorial)
4. Save preferences

### Testing calendar and leave alerts

1. Go to the calender tab (2nd tab) and reload
2. Your lectures and tutorials should appear with leave times shown in green
3. Show route details should show under each calendar item in blue and it'll show a screen giving you the directions to take to travel.
4. The leave-soon notifications are scheduled automatically so they fire when the app is closed.

### Testing coursework

1. Go to the modules tab and create a module
2. Add a coursework with a title, due date and weighting
3. There's an on-site toggle so that if it's a presentation or exam, it'll show up with route details on the timetable tab.
4. You can use the dit button to enter a score % after recieving your mark, which will be used to calculate weightings.
5. Coursework will show up in the calendar tab, with on-site coursework items having route details alongside it

### Logging out

At the top of the modules tab, there's the log out button which will return you to the login screen.

### Deleting your account

In the settings tab (4th tab) ,near the bottom, there's a delete account button.
If you click it, you'll be sent a 6 digit code again to your email for confirmation
Enter it in the app and your user data will be deleted.
