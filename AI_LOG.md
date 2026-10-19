# AI_LOG

Ten dokument opisuje, jak pracowałem z narzędziami AI przy tym zadaniu: czego używałem, jakie
polecenia były kluczowe, w których miejscach AI się pomyliło i jak te błędy wychwyciłem
i naprawiłem.

## Narzędzia

- **Claude Code** (model Claude Opus 5.5, praca w terminalu) — analiza briefu i dokumentu
  testowego, projekt architektury, implementacja, testy, przegląd kodu i dokumentacja. Decyzje
  należały do mnie: wybór backendu i modelu, zakres uprawnień, sposób wdrożenia. Każdą zmianę
  przeglądałem i weryfikowałem, zanim trafiła do repozytorium.
- **Google Gemini API** (`gemini-3.6-flash`, zapasowo `gemini-3.5-flash-lite`) — model, z którego
  korzysta aplikacja.
- **Playwright z przeglądarką Firefox** — testy całej ścieżki użytkownika w prawdziwej
  przeglądarce oraz zrzuty ekranu do README.

## Kluczowe polecenia (w skrócie)

1. **Analiza zadania, zanim powstanie kod**

   > „Trzeba rozwiązać zadanie rekrutacyjne, najpierw się z nim zapoznaj. Umieściłem w tym folderze
   > dwa pliki PDF.”

   Zacząłem od analizy briefu i umowy testowej, a nie od pisania kodu. Wynikiem była lista
   pułapek: ukryte polecenie dla AI na stronie 4, strona 11 będąca skanem bez warstwy tekstowej
   (aneks, który zmienia warunki umowy), trzy waluty, polski zapis liczb, daty zapisane słownie,
   fragment po angielsku i układ dwukolumnowy.

2. **Ponowna, dokładniejsza analiza dokumentu**

   > „Sprawdź jeszcze raz, czy nie ma ich więcej. […] Te dokumenty mające AI injection mogłyby
   > oszukać Gemini i zwrócić zły wynik.”

   Analiza czcionek i kolorów pokazała, że wstrzyknięte polecenie to **biały tekst o wielkości
   5 pt** — niewidoczny dla człowieka, ale czytany przez model. Wyszły też pułapki merytoryczne:
   nazwiska w przypadkach zależnych („Annę Kowalczyk”), inicjały („A. Kowalczyk”), budżet
   (250 000 zł) łatwy do pomylenia z wynagrodzeniem (184 500 zł) oraz kilka dat, z których tylko
   jedna jest datą dokumentu. Na tej podstawie zaprojektowałem wielowarstwową ochronę: osobne
   miejsce na polecenia i na treść dokumentu, znaczniki z losowym identyfikatorem, wymuszony
   schemat odpowiedzi, weryfikację danych w kodzie i ostrzeżenie w interfejsie.

3. **Wybór backendu**

   > „Backend może FastAPI albo Nuxt server — co będzie lepiej pasować i będzie lekkie […]
   > Ja jestem za Nuxt / Nitro backend, dokonaj analizy, na co lepiej postawić, i uzasadnij.”

   Wybrałem Nitro (silnik serwerowy Nuxta) uruchomiony na Cloudflare Workers. Rozstrzygnął czas
   odpowiedzi: darmowe hostingi dla aplikacji w Pythonie usypiają je po bezczynności, a ich
   wybudzenie trwa 30–60 s, podczas gdy brief wymaga wyniku w mniej niż 30 s.

4. **Zasada najmniejszych uprawnień**

   > „Jakie dodatkowe uprawnienia muszę dać na Cloudflare? Chodzi o to, żeby były minimalne […]
   > jeśli coś jest niepotrzebne, to nie dajesz uprawnień.”

   AI zaproponowało logowanie przez `wrangler login`, które wymaga zgody na około 30 uprawnień
   (m.in. bazy D1, KV, kolejki, poczta, DNS). Odrzuciłem tę propozycję i wdrożyłem backend tokenem
   API z jednym uprawnieniem (_Workers Scripts: Edit_), ograniczonym do jednego konta i ważnym
   tylko kilka dni.

5. **Przegląd przed oddaniem**

   > „Zrób jeszcze przegląd, czy wszystko jest w porządku.”

   Przegląd kodu i testy w prawdziwej przeglądarce ujawniły kilka błędów, które opisuję niżej
   (punkty 8–11).

## Błędy AI i ich poprawki

1. **Błędna liczba osób w dokumencie.** AI podało, że w umowie występuje 15 osób, a jest ich 9.
   _Wykrycie:_ ponowna analiza dokumentu. _Poprawka:_ korekta analizy; w poleceniu dla modelu
   doszedł wymóg usuwania duplikatów i podawania nazwisk w mianowniku.

2. **Commity mimo błędów lintera.** Pierwsze commity przeszły, choć ESLint zgłaszał 26 błędów.
   Wynik lintera był przekazywany przez `| tail`, więc sprawdzany był kod wyjścia polecenia
   `tail`, a nie ESLinta. _Wykrycie:_ ręczna kontrola wyniku. _Poprawka:_ błędy naprawione
   i włączone do właściwych commitów; od tej pory lint uruchamiam bez potoku.

3. **Zbyt świeże wersje zależności.** AI wymusiło wersje paczek opublikowane kilka godzin
   wcześniej, przez co pnpm dopisał wyjątki od zasady `minimumReleaseAge`. _Wykrycie:_ przegląd
   `pnpm-workspace.yaml`. _Poprawka:_ poluzowane zakresy wersji i usunięte wyjątki — pnpm wybrał
   wydania, które przeszły okres karencji. To zabezpieczenie przed atakami na łańcuch dostaw.

4. **Niejasny plik `.env.example`.** Jeden plik opisywał zmienne dwóch różnych pakietów, przez co
   klucz API trafił do pliku `.env`, którego żadna z aplikacji nie odczytuje. _Wykrycie:_ zapytałem
   o rozbieżność między instrukcją a działaniem aplikacji. _Poprawka:_ osobne pliki
   `api/.env.example` i `web/.env.example`; istniejący plik rozdzieliłem bez wyświetlania klucza.

5. **Model wybrany na podstawie dokumentacji, a nie pomiaru.** AI wybrało `gemini-3.8-flash`,
   oznaczony w dokumentacji jako najnowszy stabilny. W darmowym planie odpowiadał po 70 s albo
   zwracał błąd 503. _Wykrycie:_ test całej ścieżki i pomiar czasów odpowiedzi. _Poprawka:_
   `gemini-3.6-flash` (ok. 1,4 s dla krótkiego zapytania, 8–11 s dla całej umowy) oraz
   przełączanie na model zapasowy również po przekroczeniu limitu czasu.

6. **Pomylone pojęcia.** Model nazwał wynagrodzenie (184 500 zł) „budżetem”, choć budżet wynosi
   250 000 zł. _Wykrycie:_ porównanie pierwszego wyniku z treścią umowy. _Poprawka:_ reguła
   w poleceniu dla modelu — zachowuj pojęcia z dokumentu (budżet to nie wynagrodzenie, kwota netto
   to nie brutto).

7. **Wymyślone dni w datach.** Model zamieniał „2 kwietnia” na `2026-04-12`, „wrzesień 2025”
   na `2025-09-01`, a „I kwartał 2027” na `2027-01-01`. _Wykrycie:_ automatyczna weryfikacja dat
   w kodzie. _Poprawka:_ doprecyzowane polecenie dla modelu oraz oznaczenie „do sprawdzenia” przy
   każdej dacie, której nie ma w tekście PDF. Polecenie zmniejsza liczbę takich błędów, a kod
   wychwytuje te, które mimo to się pojawią.

8. **Zła ścieżka w podglądzie produkcyjnym.** Ścieżka bazowa w Vite była ustawiona tylko dla
   budowania aplikacji, więc `vite preview` serwował pliki spod niewłaściwego adresu. _Wykrycie:_
   test w przeglądarce. _Poprawka:_ jedna ścieżka `/Fastline-Advertising-demo/` we wszystkich
   trybach.

9. **Poziome przewijanie na telefonie.** Przy szerokości 360 px widok wyniku wystawał poza ekran
   o 35 px, bo siatka CSS bez `minmax(0, 1fr)` rozciągała się do szerokości tabeli. _Wykrycie:_
   pomiar `scrollWidth` w Playwright. _Poprawka:_ poprawione kolumny siatki i dwukolumnowa tabela
   kwot.

10. **Nieaktualne API biblioteki.** AI użyło `pdf.destroy()` ze starszej wersji pdf.js; w wersji 6
    pamięć zwalnia się przez `loadingTask.destroy()`. _Wykrycie:_ błąd kompilacji TypeScript.
    _Poprawka:_ zwalnianie pamięci przez zadanie ładowania dokumentu.

11. **Drobne usterki z przeglądu kodu.** Adres pliku do pobrania był zwalniany od razu po
    kliknięciu (Firefox potrafi wtedy przerwać pobieranie), obraz do OCR nie miał limitu
    rozmiaru, ostrzeżenie o wstrzykniętym poleceniu wyświetlało się podwójnie, a cytat urywał się
    w połowie słowa. _Wykrycie:_ przegląd kodu i testy. _Poprawka:_ opóźnione zwolnienie adresu,
    limit 2400 px dla dłuższego boku obrazu, łączenie pobliskich trafień i rozszerzanie cytatu
    do pełnych słów.

## Jak upewniałem się, że rozumiem kod

- Kod podzieliłem tak, żeby każdy plik odpowiadał za jedno zadanie: odczyt PDF, weryfikację
  kwot i dat, komunikację z Gemini, widok wyniku. Dzięki temu każdy fragment da się przeczytać
  i wyjaśnić niezależnie od reszty.
- Logikę niezależną od interfejsu (`shared/`, `api/server/utils/`) obejmują testy jednostkowe,
  które uruchamiałem po każdej zmianie.
- Frontend jest celowo prosty: bez Reduxa i bibliotek do zarządzania zapytaniami. Cały przebieg
  analizy mieści się w jednym hooku `useAnalysis` — odpowiedniku composable z Vue i Nuxta,
  z którymi pracuję na co dzień. Stan aplikacji to jeden typ z czterema wariantami
  (`idle | working | done | error`), więc to, co widzi użytkownik, wynika z niego bezpośrednio.
- Każdy błąd z listy powyżej najpierw odtworzyłem — testem, pomiarem albo zrzutem ekranu —
  i dopiero potem poprawiałem, zamiast przyjmować wyjaśnienie AI na słowo.
