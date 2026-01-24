# GeoLog

## Opis projektu

GeoLog to aplikacja webowa wykonana w ramach pracy inżynierskiej, służąca do zarządzania i analizy tras GPS. System umożliwia import plików GPX, ręczne tworzenie tras na mapie, obliczanie statystyk przejazdu (dystans, czas, prędkości, przewyższenia) oraz wykrywanie i korekcję błędów danych GPS.

Projekt został zrealizowany w architekturze klient–serwer z podziałem na backend oraz frontend.

---

## Wykorzystane technologie

**Backend:**

* ASP.NET Core (C#)
* Entity Framework Core
* PostgreSQL z rozszerzeniem PostGIS
* JWT (autoryzacja)

**Frontend:**

* React (Vite)
* Material UI
* Leaflet / Google Maps API

---

## Wykorzystane biblioteki

### Backend (.NET / ASP.NET Core)

- AutoMapper – mapowanie encji domenowych na obiekty DTO  
- BCrypt.Net-Next – bezpieczne haszowanie haseł użytkowników  
- Entity Framework Core – mapowanie ORM oraz dostęp do bazy danych  
- EFCore.NamingConventions – konwencje nazewnictwa tabel i kolumn w PostgreSQL  
- Npgsql.EntityFrameworkCore.PostgreSQL – obsługa bazy danych PostgreSQL  
- NetTopologySuite (PostGIS) – obsługa danych przestrzennych i geolokalizacyjnych  
- Microsoft.AspNetCore.Authentication.JwtBearer – uwierzytelnianie oparte o tokeny JWT  
- MailKit – wysyłanie wiadomości e-mail
- SixLabors.ImageSharp – przetwarzanie i skalowanie obrazów 
- Swashbuckle.AspNetCore (Swagger) – dokumentacja REST API  

### Frontend (React)

- React – budowa interfejsu użytkownika 
- React Router – obsługa routingu po stronie klienta  
- Material UI – komponenty interfejsu użytkownika  
- Emotion – stylowanie komponentów React  
- Leaflet – wizualizacja tras na mapach  
- React Leaflet – integracja Leaflet z React  
- Google Maps API – alternatywny dostawca map 
- Recharts – wizualizacja danych statystycznych

---

## Wymagania systemowe

* .NET SDK 7.0 lub nowszy
* Node.js 18 lub nowszy
* PostgreSQL z włączonym rozszerzeniem PostGIS
* (opcjonalnie) klucz Google Maps API

---

## Instalacja i uruchomienie

### Backend

1. Przejść do katalogu backendu:

   ```bash
   cd GeoLog.Api
   ```

2. Skonfigurować plik `appsettings.json`:

   * połączenie z bazą danych PostgreSQL
   * ustawienia JWT
   * dane serwera SMTP (weryfikacja e-mail)

3. Wykonać migracje bazy danych:

   ```bash
   dotnet ef database update
   ```

4. Uruchomić aplikację backendową:

   ```bash
   dotnet run
   ```

Backend dostępny jest pod adresem:

```
https://localhost:7156
```

---

### Frontend

1. Przejść do katalogu frontendu:

   ```bash
   cd frontend
   ```

2. Zainstalować zależności:

   ```bash
   npm install
   ```

3. (Opcjonalnie) utworzyć plik `.env` i dodać klucz Google Maps API:

   ```env
   VITE_GOOGLE_MAPS_API_KEY=TWÓJ_KLUCZ_API
   ```

4. Uruchomić aplikację frontendową:

   ```bash
   npm run dev
   ```

Frontend dostępny jest pod adresem:

```
http://localhost:5173
```

---

## Uwagi końcowe

* Backend musi zostać uruchomiony przed frontendem
* Aplikacja obsługuje wyłącznie pliki GPX
* Nowe konta użytkowników wymagają weryfikacji adresu e-mail
---
