# CitySync
CitySync is a full-stack mobile app that acts as an intelligent student planner that integrates timetable events, coursework and real-time travel planning all together.

The system consists of a React native mobile app that communicates with a Spring Boot backend API

## Features
1. Unified timetable combining device calendar and coursework
2. Real-time travel time estimations using Google Routes API based on arrival times
3. Leave-soon travel notifications based on travel + buffer times
4. Coursework tracking with weightings and grade calculations
5. Email-based authentication with verification codes

Ehsan Ahmed

Email: ehsan.ahmed@city.ac.uk

Student id:220000786

Consultant: Dr Panos Giannopoulos

## My stack

Backend: Spring Boot Java,PostgreSQL
Mobile: React native (Expo), Typescript
APIs: Google Routes API
Services: GMAIL SMTP (email server)

## Project Structure

Project structure is organised into 2 main components whihc is a backend API and mobile application.

### Root Directory
CitySync_Schema.sql is a PostgreSQL schema used to initialise the database.

README.md includes the setup instructions and project overview

/backend for Spring Boot API

/mobile for Expo mobile App


### Backend

Spring Boot REST API for decision lofic, authentication and external API integration.

#### src/main/java/com/citysync/backend/:

auth/ is for email verification and authentication logic

user/ is for user entity and data access

coursework/ is for coursework management such as CRUD,weightings and logic

module/ is for module management

travel/ is for integration with Google Routes API

src/main/resources/application.properties contains the backend configuration such as database, email and API keys


#### Mobile /mobile

app/ has the main screens using Expo router such as tabs, onboarding

components/ are reusable components such as buttons and cards

lib/ has helper functions such as API calls and travel logic

assets/ has images/icons that come with React

app.json has Expo configurations


## Prerequisites

Node.js

Java 21

PostgreSQL

Expo Go (on your mobile device)

## Database setup

### Create a postgresql database called citysync:

psql -U postgres -c "CREATE DATABASE citysync;"

### and then import the schema:

psql -U postgres -d citysync -f CitySync_Schema.sql

## Setting up environment variables

### Open up powershell before you run the backend and set your environment variables:

$env:GOOGLE_ROUTES_KEY="yourroutes_api_key"

$env:MAIL_USER="you@gmail.com"

$env:MAIL_PASS="your_app_password"


## Setting up google Routes API


To set up the API key:

1. Create a google cloud project
2. You have to setup and enable billing for the project
3. Enable the routes API
4. Create an API key
5. Restrict the key to Routes API only

## Gmail SMTP setup/app password

CitySync uses gmail SMTP for sending emails with verification codes, the backend expects MAIL_USER and MAIL_PASS

### SMTP Config

enable 2FA on your gmail

Generate app password

use it as Mail_PASS in the environment variables step (scroll up)

Host: smtp.gmail.com

port: 587


## Backend setup and run

have the citysync directory open in powershell 

cd backend

### windows
.\mvnw.cmd spring-boot:run

### mac
./mvnw spring-boot:run


The backend runs on:

http://localhost:8080

## Mobile setup

Open another powershell window and change directory citysync

cd mobile

npm install

npx expo start

## Local config

### Get your local IP:
ipconfig for windows

ifconfig for mac

retrieve the value of the ipv4 (e.g. 192.168.0.12)

update mobile/lib/api.ts and change:

const API_BASE = "http://Your_IP:8080";

The app uses a hardcoded backend URL in const API_BASE = "http://192.168.0.12:8080";

Once you get your IPv4 add colons and the 8080 port like: const API_BASE = "http://IP.168.x.y:8080";


## Running the app

Scan QR code with Expo Go

App should load login screen

## CitySync Usage guide

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

### Calendar features and leave alerts

1. Go to the calendar tab (2nd tab) and reload
2. Your lectures and tutorials should appear with leave times shown in green
3. Show route details should show under each calendar item in blue and it'll show a screen giving you the directions to take to travel.
4. The leave-soon notifications are scheduled automatically so they fire when the app is closed.

### Coursework

1. Go to the modules tab and create a module
2. Add a coursework with a title, due date and weighting
3. There's an on-site toggle so that if it's a presentation or exam, it'll show up with route details on the timetable tab.
4. You can use the edit button to enter a score % after receiving your mark, which will be used to calculate weightings.
5. Coursework will show up in the calendar tab, with on-site coursework items having route details alongside it

### Account features

•At the top of the modules tab, there's the log out button which will return you to the login screen.

•In the settings tab (4th tab) ,near the bottom, there's a delete account button.

If you click it, you'll be sent a 6 digit code again to your email for confirmation

Enter it in the app and your user data will be deleted.
