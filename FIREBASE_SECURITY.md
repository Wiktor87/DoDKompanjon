# Firebase Security Configuration

## Important: Configure Firestore Security Rules

Your Firebase configuration is visible in the client-side code. This is normal for web apps, but you MUST configure proper Firestore Security Rules to protect your data.

### Deploying Firestore Rules

The Firestore security rules are defined in `firestore.rules`. To deploy them to your Firebase project:

#### Option 1: Using Firebase Console (Manual)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `drakar-demoner-companion`
3. Navigate to **Firestore Database** > **Rules**
4. Copy the contents of `firestore.rules` and paste it into the rules editor
5. Click **Publish**

#### Option 2: Using Firebase CLI (Recommended)
1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your project: `drakar-demoner-companion`
   - Accept the default `firestore.rules` file

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Current Firestore Rules

The `firestore.rules` file includes:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Characters: users can only access their own characters
    match /characters/{characterId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.ownerId;
    }
    
    // Groups/Parties: users can read groups they're members of or that are public
    match /parties/{partyId} {
      allow read: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         request.auth.uid in resource.data.memberIds ||
         resource.data.isPublic == true);
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.ownerId;
      allow update, delete: if request.auth != null && 
        resource.data.ownerId == request.auth.uid;
    }
    
    // Join requests for group join feature
    match /joinRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.requesterId;
      allow update, delete: if request.auth != null && 
        (resource.data.requesterId == request.auth.uid ||
         resource.data.groupOwnerId == request.auth.uid);
    }
  }
}
```

### Additional Security Recommendations

1. **Enable App Check** - Helps ensure only your app can access Firebase
2. **Configure Auth Providers** - Only enable authentication methods you use
3. **Set up Budget Alerts** - Monitor usage to detect abuse
4. **Review Storage Rules** - If using Firebase Storage, add similar restrictions
