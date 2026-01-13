# Firebase Security Configuration

## Important: Configure Firestore Security Rules

Your Firebase configuration is visible in the client-side code. This is normal for web apps, but you MUST configure proper Firestore Security Rules to protect your data.

### Recommended Firestore Rules

Go to Firebase Console > Firestore Database > Rules, and add:

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
  }
}
```

### Additional Security Recommendations

1. **Enable App Check** - Helps ensure only your app can access Firebase
2. **Configure Auth Providers** - Only enable authentication methods you use
3. **Set up Budget Alerts** - Monitor usage to detect abuse
4. **Review Storage Rules** - If using Firebase Storage, add similar restrictions
