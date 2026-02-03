# GLP Tracker

Webová aplikace pro sledování GLP-1 léků (Mounjaro, Wegovy, Ozempic, Saxenda, Retatrutide), váhy a zdraví.

## Funkce

### 📊 Dashboard (Přehled)
- Aktuální hladina léku v těle (farmakokinetická křivka)
- Statistiky váhy: aktuální, změna za týden/měsíc, BMI
- Nutriční přehled (kalorie, bílkoviny, sacharidy, tuky)
- Rychlé přidání váhy a měření těla

### 💉 Injekce
- Graf hladiny léku v čase
- Historie všech aplikací
- Přidání nové injekce (látka, dávka, místo vpichu)

### 🧮 Kalkulačka
- **Vialka mód**: Výpočet jednotek (IU) z mg, vizualizace stříkačky
- **Pero mód**: Výpočet kliků pro různá pera (Mounjaro, Ozempic, Saxenda)
- Podpora US/EU režimu

### 📓 Deník
- Záznamy nálady a vedlejších účinků
- Hodnocení hvězdičkami (1-5)
- Poznámky

### 📦 Skladiště
- Přehled zásob léků (vialky, pera)
- Sledování zbývajícího množství
- Použití ze skladu

### 👤 Profil
- Osobní údaje (jméno, výška, cílová váha)
- Nutriční plán (cíl, intenzita, aktivita)
- Nastavení aplikace (US/EU režim)

## Technologie

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Databáze**: Convex (real-time)
- **Autentizace**: Email OTP
- **Grafy**: Recharts

## Struktura

```
app/
  page.tsx          # Hlavní stránka
  layout.tsx        # Root layout s Convex providerem
  globals.css       # Tmavé téma a barvy

components/
  app-shell.tsx     # Hlavní shell s navigací
  auth/
    login-form.tsx  # Přihlašovací formulář
  tabs/
    dashboard-tab.tsx   # Přehled
    injections-tab.tsx  # Injekce
    calculator-tab.tsx  # Kalkulačka
    journal-tab.tsx     # Deník
    inventory-tab.tsx   # Skladiště
    profile-tab.tsx     # Profil

convex/
  schema.ts         # Databázové schéma
  users.ts          # Uživatelské funkce
  records.ts        # CRUD pro záznamy

lib/
  constants.ts      # Substance, pera, barvy
  pharmacokinetics.ts # Výpočet hladiny léku
  nutrition.ts      # Výpočet kalorií
```

## Podporované látky

| Látka | Účinná látka | Poločas rozpadu |
|-------|--------------|-----------------|
| Mounjaro / Zepbound | Tirzepatide | ~5 dní |
| Wegovy | Semaglutide | ~7 dní |
| Ozempic | Semaglutide | ~7 dní |
| Saxenda | Liraglutide | ~13 hodin |
| Retatrutide | Retatrutide | ~6 dní |
