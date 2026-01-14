# Firebase Authentication Setup Guide

## Issue: Email/Password Sign-In Not Working

If you're seeing the error `auth/invalid-login-credentials` when trying to sign in with email and password, it's likely because the Email/Password authentication provider is not enabled in your Firebase project.

## How to Fix

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Select your project: `drakar-demoner-companion`

2. **Enable Email/Password Authentication**
   - In the left sidebar, click on "Authentication"
   - Click on the "Sign-in method" tab
   - Find "Email/Password" in the list of providers
   - Click on "Email/Password"
   - Toggle the "Enable" switch to ON
   - Click "Save"

3. **Optional: Enable Email Link (Passwordless) Sign-In**
   - In the same "Email/Password" provider settings
   - You can also enable "Email link (passwordless sign-in)" if desired
   - Click "Save"

4. **Test the Authentication**
   - Try creating a new account with email/password
   - Try signing in with the credentials
   - The authentication should now work correctly

## Password Reset Feature

The app now includes a "Glömt lösenord?" (Forgot Password) link that uses Firebase's built-in password reset email functionality. For this to work:

1. **Configure Email Templates** (Optional but Recommended)
   - In Firebase Console > Authentication > Templates
   - Customize the password reset email template with your branding
   - Set the sender name and reply-to email

2. **How it Works**
   - User clicks "Glömt lösenord?" link
   - User enters their email address
   - Firebase sends a password reset email
   - User clicks the link in the email
   - User sets a new password
   - User can now sign in with the new password

## Firestore Security Rules

The Firestore security rules have been updated to allow authenticated users to list parties. Make sure to deploy the updated rules:

```bash
firebase deploy --only firestore:rules
```

Or deploy them manually in the Firebase Console:
- Go to Firestore Database > Rules
- Copy the contents of `firestore.rules`
- Click "Publish"

## Testing

After enabling Email/Password authentication:

1. **Test Registration**
   - Open the app
   - Click "Skapa konto" (Create Account)
   - Fill in username, email, and password
   - Click "Skapa konto"
   - Should successfully create account and sign in

2. **Test Sign-In**
   - Sign out
   - Click "Logga in" (Log In)
   - Enter email and password
   - Click "Logga in"
   - Should successfully sign in

3. **Test Password Reset**
   - Click "Logga in"
   - Click "Glömt lösenord?" link
   - Enter email address
   - Check email for reset link
   - Click link and set new password
   - Sign in with new password

4. **Test Google Sign-In**
   - Click "Fortsätt med Google"
   - Select Google account
   - Should successfully sign in

## Additional Notes

- The Firebase configuration in `js/firebase-config.js` appears to be correct
- All Firebase services (Auth, Firestore, Storage) are properly initialized
- The error handling has been improved to show user-friendly messages in Swedish
- The official Google Sign-In button now includes the proper Google "G" logo
