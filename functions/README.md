# Firebase Cloud Functions - DoD Kompanjon

This directory contains Cloud Functions for email notifications and scheduled tasks.

## Features

### 1. Session Scheduled Notification (`onSessionScheduled`)
- **Trigger**: Firestore document update on `parties/{partyId}`
- **Action**: Sends email to all party members when a new session is scheduled
- **Email Content**: Includes party name and session date/time

### 2. Session Reminder (`sendSessionReminders`)
- **Trigger**: Scheduled daily at 10:00 AM (Sweden time)
- **Action**: Checks for sessions in the next 24 hours and sends reminder emails
- **Email Content**: Reminds party members about tomorrow's session

## Setup

### Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project initialized with Firestore and Authentication

### Installation

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up email service (choose one):

   **Option A: Firebase Extension - Trigger Email**
   ```bash
   firebase ext:install firebase/firestore-send-email
   ```
   - Configure the extension to watch the `mail` collection
   - Add your SMTP credentials or use SendGrid/Mailgun

   **Option B: Custom Email Service**
   - Modify `index.js` to use your preferred email service
   - Replace the `db.collection('mail').add()` calls with direct email sending

### Deployment

1. Deploy all functions:
   ```bash
   npm run deploy
   ```

2. Or deploy individual functions:
   ```bash
   firebase deploy --only functions:onSessionScheduled
   firebase deploy --only functions:sendSessionReminders
   ```

### Testing

1. Start the Firebase emulator:
   ```bash
   npm run serve
   ```

2. Test session scheduling:
   - Schedule a session through the UI
   - Check the emulator logs for email queue entries

3. Test reminders:
   - Manually trigger the scheduled function or wait for daily execution

## Email Collection Schema

The functions queue emails in the `mail` collection:

```javascript
{
  to: ['email1@example.com', 'email2@example.com'],
  message: {
    subject: 'Email subject',
    text: 'Plain text content',
    html: 'HTML content'
  },
  createdAt: Timestamp,
  partyId: 'party-id',
  type: 'session_scheduled' | 'session_reminder'
}
```

## User Email Storage

The functions expect user emails to be stored either:
1. In the `users/{userId}` Firestore collection with an `email` field
2. Or will fallback to Firebase Authentication user records

## Troubleshooting

### Emails not sending
1. Check the `mail` collection for queued emails
2. Verify the Trigger Email extension is installed and configured
3. Check function logs: `npm run logs`

### Reminders not working
1. Verify the scheduled function is deployed
2. Check that `nextSessionTimestamp` is a Firestore Timestamp
3. Ensure `lastReminderSent` field is updated after sending

### Permission errors
1. Verify Firestore security rules allow the functions to read/write
2. Check that Cloud Functions service account has necessary permissions

## Security

Make sure your `firestore.rules` allow the functions service account to:
- Read user documents
- Read and update party documents  
- Write to the mail collection

## Cost Considerations

- `onSessionScheduled`: Triggered on party updates (free tier: 125K invocations/month)
- `sendSessionReminders`: Runs once daily (free tier includes Cloud Scheduler)
- Emails: Cost depends on your email service provider
