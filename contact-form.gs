/**
 * Contact-form handler for Waynstan's portfolio.
 * Logs each submission to a Google Sheet and emails you a notification.
 *
 * SETUP (one time):
 *  1. Create a new Google Sheet (this will store submissions).
 *  2. In that Sheet: Extensions → Apps Script. Delete any sample code and paste this whole file.
 *  3. Make sure NOTIFY_EMAIL below is correct.
 *  4. Click Deploy → New deployment → type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Click Deploy, authorize when prompted, and COPY the Web app URL.
 *  5. Paste that URL into contact.js (the CONTACT_ENDPOINT constant).
 *
 * To change the code later, use Deploy → Manage deployments → edit → Deploy
 * (or create a new deployment) so the live URL picks up your changes.
 */

const NOTIFY_EMAIL = 'waynstanaung@berkeley.edu';
const SHEET_NAME = 'Submissions';

function doPost(e) {
  try {
    const data = (e && e.parameter) ? e.parameter : {};
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const phone = String(data.phone || '').trim();
    const message = String(data.message || '').trim();
    const ts = new Date();

    // 1) Append to the sheet (creates the tab + header row on first run)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Phone', 'Message']);
    }
    sheet.appendRow([ts, name, email, phone, message]);

    // 2) Email you a notification (reply goes straight to the sender)
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      replyTo: email || NOTIFY_EMAIL,
      subject: 'New portfolio message from ' + (name || 'someone'),
      body:
        'New message from your portfolio contact form:\n\n' +
        'Name:    ' + name + '\n' +
        'Email:   ' + email + '\n' +
        'Phone:   ' + (phone || '—') + '\n' +
        'Time:    ' + ts + '\n\n' +
        'Message:\n' + message + '\n'
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('Contact endpoint is live.');
}
