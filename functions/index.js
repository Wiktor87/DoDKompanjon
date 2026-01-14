/**
 * Cloud Functions for DoD Kompanjon
 * 
 * Features:
 * 1. Send email notification when a new session is scheduled
 * 2. Send reminder emails 24 hours before a session
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Constants
const REMINDER_WINDOW_HOURS = 23; // Don't send duplicate reminders within this window

/**
 * Trigger when a party's nextSessionTimestamp is updated
 * Sends email notification to all party members
 */
exports.onSessionScheduled = functions.firestore
    .document('parties/{partyId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        
        // Check if nextSessionTimestamp was added or changed
        if (!after.nextSessionTimestamp || 
            (before.nextSessionTimestamp && 
             after.nextSessionTimestamp.toMillis() === before.nextSessionTimestamp.toMillis())) {
            return null;
        }
        
        console.log('New session scheduled for party:', context.params.partyId);
        
        // Get party members
        const memberIds = after.memberIds || [];
        if (memberIds.length === 0) {
            console.log('No members in party');
            return null;
        }
        
        // Fetch member emails
        const memberEmails = [];
        for (const memberId of memberIds) {
            try {
                const userDoc = await db.collection('users').doc(memberId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.email) {
                        memberEmails.push(userData.email);
                    }
                } else {
                    // Try to get email from Firebase Auth
                    const userRecord = await admin.auth().getUser(memberId);
                    if (userRecord && userRecord.email) {
                        memberEmails.push(userRecord.email);
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', memberId, error);
            }
        }
        
        if (memberEmails.length === 0) {
            console.log('No member emails found');
            return null;
        }
        
        console.log('Sending session notification to:', memberEmails);
        
        // Prepare email data
        const emailData = {
            to: memberEmails,
            message: {
                subject: `Ny session schemalagd: ${after.name}`,
                text: `En ny spelession har schemalagts för gruppen "${after.name}"!\n\n` +
                      `📅 Tid: ${after.nextSession}\n\n` +
                      `Logga in på DoD Kompanjon för mer information.\n\n` +
                      `Se dig där!`,
                html: `<h2>Ny session schemalagd!</h2>` +
                      `<p>En ny spelession har schemalagts för gruppen <strong>"${after.name}"</strong>!</p>` +
                      `<p>📅 <strong>Tid:</strong> ${after.nextSession}</p>` +
                      `<p>Logga in på DoD Kompanjon för mer information.</p>` +
                      `<p>Se dig där!</p>`
            }
        };
        
        // Note: This requires setting up Firebase Extensions - Trigger Email
        // or implementing a custom email service (SendGrid, Mailgun, etc.)
        // For now, we'll queue the email in a collection for processing
        try {
            await db.collection('mail').add({
                ...emailData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                partyId: context.params.partyId,
                type: 'session_scheduled'
            });
            console.log('Email queued successfully');
        } catch (error) {
            console.error('Error queueing email:', error);
        }
        
        return null;
    });

/**
 * Scheduled function that runs daily at 10:00 AM (Sweden time)
 * Sends reminder emails for sessions happening in the next 24 hours
 */
exports.sendSessionReminders = functions.pubsub
    .schedule('0 10 * * *')
    .timeZone('Europe/Stockholm')
    .onRun(async (context) => {
        console.log('Running session reminder check...');
        
        const now = admin.firestore.Timestamp.now();
        const tomorrow = admin.firestore.Timestamp.fromMillis(
            now.toMillis() + (24 * 60 * 60 * 1000)
        );
        
        // Find parties with sessions in the next 24 hours
        const partiesSnapshot = await db.collection('parties')
            .where('nextSessionTimestamp', '>', now)
            .where('nextSessionTimestamp', '<', tomorrow)
            .get();
        
        if (partiesSnapshot.empty) {
            console.log('No sessions in the next 24 hours');
            return null;
        }
        
        console.log(`Found ${partiesSnapshot.size} sessions to remind about`);
        
        const reminderPromises = [];
        
        for (const partyDoc of partiesSnapshot.docs) {
            const party = partyDoc.data();
            const partyId = partyDoc.id;
            
            // Check if we already sent a reminder
            const lastNotification = party.lastReminderSent;
            const reminderThresholdMillis = now.toMillis() - (REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
            if (lastNotification && lastNotification.toMillis() > reminderThresholdMillis) {
                console.log(`Already sent reminder for party ${partyId}`);
                continue;
            }
            
            // Get party members
            const memberIds = party.memberIds || [];
            if (memberIds.length === 0) {
                continue;
            }
            
            // Fetch member emails
            const memberEmails = [];
            for (const memberId of memberIds) {
                try {
                    const userDoc = await db.collection('users').doc(memberId).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.email) {
                            memberEmails.push(userData.email);
                        }
                    } else {
                        const userRecord = await admin.auth().getUser(memberId);
                        if (userRecord && userRecord.email) {
                            memberEmails.push(userRecord.email);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user:', memberId, error);
                }
            }
            
            if (memberEmails.length === 0) {
                continue;
            }
            
            console.log(`Sending reminder for party ${partyId} to:`, memberEmails);
            
            // Prepare email data
            const emailData = {
                to: memberEmails,
                message: {
                    subject: `Påminnelse: Session imorgon - ${party.name}`,
                    text: `Glöm inte er spelession imorgon!\n\n` +
                          `Grupp: ${party.name}\n` +
                          `📅 Tid: ${party.nextSession}\n\n` +
                          `Vi ses imorgon!`,
                    html: `<h2>Påminnelse: Session imorgon!</h2>` +
                          `<p>Glöm inte er spelession imorgon!</p>` +
                          `<p><strong>Grupp:</strong> ${party.name}</p>` +
                          `<p>📅 <strong>Tid:</strong> ${party.nextSession}</p>` +
                          `<p>Vi ses imorgon!</p>`
                }
            };
            
            // Queue email and update party
            reminderPromises.push(
                db.collection('mail').add({
                    ...emailData,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    partyId: partyId,
                    type: 'session_reminder'
                }).then(() => {
                    return db.collection('parties').doc(partyId).update({
                        lastReminderSent: admin.firestore.FieldValue.serverTimestamp()
                    });
                })
            );
        }
        
        await Promise.all(reminderPromises);
        console.log(`Sent ${reminderPromises.length} reminders`);
        
        return null;
    });
