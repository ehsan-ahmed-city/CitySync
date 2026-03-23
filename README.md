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

Create a postgresq; database called citysync

These are the local database settings I use:
spring.datasource.url=jdbc:postgresql://localhost:5432/citysync

spring.datasource.username=postgres

spring.datasource.password=postgres

## Setting up google Routes API

CitySync use google routes api for travel time calculations. The backend should read the API key from GOOGLE_ROUTES_KEY

To set up the API key:

1. Create a google cloud project
2. You have to setup and enable billing for the project
3. Enable the routes API
4. Create an API key
5. Restrict the key

Restricting the API key

Citysync calls google routes from the backend so the best set up is to restritc the key by:
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