# Drakar och Demoner Companion

En webbaserad companion-app för det svenska rollspelet Drakar och Demoner, inspirerad av D&D Beyond.

## Funktioner

- 🎭 **Karaktärshantering**: Skapa, redigera och spara karaktärer
- 📖 **Äventyrsskapare**: Skapa och dela äventyr med andra
- 🎲 **Kampanjhantering**: Organisera kampanjer med spelare och äventyr
- 👹 **Monsterdatabas**: Sök bland alla monster (kommer snart)
- 📚 **Regelreferens**: Snabb tillgång till regler (kommer snart)

## Installation och Setup

### Steg 1: Firebase-konfiguration

1. Gå till [Firebase Console](https://console.firebase.google.com/)
2. Skapa ett nytt projekt eller använd befintligt
3. Aktivera följande tjänster:
   - **Authentication** (Email/Password och Google)
   - **Firestore Database** (börja i test mode)
   - **Storage**
4. Registrera en webbapp och kopiera Firebase config
5. Öppna `js/firebase-config.js` och ersätt placeholder-värdena med din config:

```javascript
const firebaseConfig = {
    apiKey: "DIN_RIKTIGA_API_KEY",
    authDomain: "ditt-projekt.firebaseapp.com",
    projectId: "ditt-projekt-id",
    storageBucket: "ditt-projekt.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};
```

### Steg 2: Firestore Security Rules

**Important:** After updating `firestore.rules`, deploy them to Firebase:

```bash
# Deploy only firestore rules
firebase deploy --only firestore:rules
```

Alternatively, in Firebase Console, go to Firestore Database > Rules and replace with the content from `firestore.rules`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Characters collection
    match /characters/{characterId} {
      allow read: if request.auth != null && (
        resource.data.ownerId == request.auth.uid ||
        resource.data.campaignId != null
      );
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null;
    }
    
    // Adventures collection
    match /adventures/{adventureId} {
      allow read: if request.auth != null && (
        resource.data.isPublic == true ||
        resource.data.authorId == request.auth.uid ||
        request.auth.uid in resource.data.sharedWith
      );
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.authorId;
      allow create: if request.auth != null;
    }
    
    // Campaigns collection
    match /campaigns/{campaignId} {
      allow read: if request.auth != null && (
        resource.data.gameMasterId == request.auth.uid ||
        request.auth.uid in resource.data.playerIds
      );
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.gameMasterId;
      allow create: if request.auth != null;
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

### Steg 3: Storage Rules

Gå till Storage > Rules och använd:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /user-uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Steg 4: Kör lokalt

Enklaste sättet är att använda en lokal webbserver:

```bash
# Med Python 3
python -m http.server 8000

# Med Node.js (installera http-server först)
npx http-server
```

Öppna sedan `http://localhost:8000` i din webbläsare.

### Steg 5: Deploy till Firebase Hosting (valfritt)

```bash
# Installera Firebase CLI
npm install -g firebase-tools

# Logga in
firebase login

# Initiera hosting
firebase init hosting

# Deploy
firebase deploy
```

## Projektstruktur

```
drakar-demoner-companion/
├── index.html              # Huvudsida
├── css/
│   ├── style.css          # Grundläggande stilar
│   └── components.css     # UI-komponenter
├── js/
│   ├── firebase-config.js # Firebase-konfiguration
│   ├── auth.js            # Autentisering
│   ├── character-service.js    # Karaktärshantering
│   ├── adventure-service.js    # Äventyrshantering
│   ├── campaign-service.js     # Kampanjhantering
│   ├── character-creator.js    # Karaktärsskapare UI
│   └── app.js             # Huvudapplikation
└── data/                  # Data-filer (kommer)
    └── monsters.json      # Monster-databas
```

## Databas-struktur

### Users
```javascript
{
  email: string,
  displayName: string,
  createdAt: timestamp
}
```

### Characters
```javascript
{
  name: string,
  race: string,
  class: string,
  level: number,
  age: number,
  attributes: {
    STY: number,
    STO: number,
    FYS: number,
    SMI: number,
    INT: number,
    PSY: number,
    KAR: number
  },
  hp: number,
  maxHp: number,
  backstory: string,
  personality: string,
  ownerId: string,
  ownerName: string,
  campaignId: string (optional),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Adventures
```javascript
{
  title: string,
  description: string,
  content: object,
  authorId: string,
  authorName: string,
  isPublic: boolean,
  sharedWith: array<string>,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Campaigns
```javascript
{
  name: string,
  description: string,
  gameMasterId: string,
  gameMasterName: string,
  playerIds: array<string>,
  characterIds: array<string>,
  adventureIds: array<string>,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Nästa Steg

1. ✅ Grundläggande Firebase-setup
2. ✅ Autentisering (email/password + Google)
3. ✅ Karaktärsskapare
4. ✅ Karaktärshantering
5. ✅ Äventyrs- och kampanjstruktur
6. ⏳ Fullständigt karaktärsblad
7. ⏳ Äventyrskapare UI
8. ⏳ Kampanjkapare UI
9. ⏳ Monsterdatabas
10. ⏳ Regelreferens
11. ⏳ PDF-export av karaktärer
12. ⏳ Bilduppladdning för karaktärer och äventyr

## Tips och Tricks

- **Test Mode**: Börja med Firestore i "test mode" för enkel utveckling
- **Security Rules**: Uppdatera till production rules innan du går live
- **Backup**: Exportera din Firestore-data regelbundet
- **Indexering**: Firestore kommer att föreslå index när du behöver dem

## Felsökning

**Problem: "Permission denied"**
- Kontrollera att du är inloggad
- Verifiera security rules i Firebase Console

**Problem: Firebase inte initialiserad**
- Kontrollera att firebase-config.js är korrekt ifylld
- Se till att alla Firebase SDK-scripts laddas före dina scripts

**Problem: Data syns inte**
- Öppna Developer Console (F12) för felmeddelanden
- Kontrollera att collections finns i Firestore

## Support

Har du problem? Kontrollera:
1. Firebase Console för felmeddelanden
2. Browser Developer Console (F12)
3. Firebase Documentation: https://firebase.google.com/docs

## Licens

Detta är ett hobbyprojekt för Drakar och Demoner-communityn.
