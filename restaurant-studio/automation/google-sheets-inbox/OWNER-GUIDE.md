# Your website inquiries: a one-page guide

When someone sends a catering request or a message through your website, three things happen within a few seconds:

1. It is saved as a new row in your Google Sheet.
2. You get an email with the details.
3. The customer gets a short automatic note saying their request arrived.

Everything lives in your own Google account. You own the Sheet and the emails.

## Where inquiries appear

- **Your email.** Subject lines start with "New catering inquiry" or "New website message".
- **Your Google Sheet**, named during setup (for example "Website inquiries"). Catering requests are in the "Catering inquiries" tab, other messages in the "Messages" tab. The newest is at the bottom.

## What the columns mean

- **Received:** when it was sent, in your local time.
- **Reference:** a short code such as CAT-20261212-7F3K. The customer has the same code. Use it when you talk to them.
- **Status:** yours to change. Click the cell and pick one.
- **The middle columns:** what the customer typed into the form.
- **Email to owner** and **Note to customer:** "Sent" when the email went out. A red-tinted cell that says "Email not sent" means that email did not go out. The row is still complete; contact that customer yourself.

## Statuses

| Status | Use it when |
| --- | --- |
| New | Nobody has replied yet. Every inquiry starts here. |
| Contacted | You or your staff have replied or called. |
| Quoted | You sent a price or a proposal. |
| Booked | The customer confirmed and you accepted. |
| Declined | You or the customer said no. |

## What the customer was told

They were told that their request arrived, given the reference, and given your phone number in case it is urgent.

They were **not** told that anything is confirmed. The note says plainly that it is not a confirmation of the event, availability or pricing, and that someone will follow up. Nothing is booked until you say so.

## How to reply

- Press **Reply** on the inquiry email. Your reply goes straight to the customer.
- Or call them at the number in the row.
- Then change the Status in the Sheet so everyone knows it was handled.

Try to reply within a day. The customer is waiting to hear from a person.

## How to pause it

If you are closed for a while, or something looks wrong (for example many strange inquiries in a row):

- Open the Sheet, then Extensions, then Apps Script.
- In the function list at the top choose **pauseInbox** and press Run.
- While paused, the website tells visitors it could not send their request and asks them to call.
- To start again, choose **resumeInbox** and press Run.

If many inquiries arrive in one hour, emails pause by themselves for the rest of that hour and you get one email explaining it. Rows are still saved.

## Good habits

- Share the Sheet only with staff who answer inquiries.
- Do not change the tab names or the header row. You may move columns and add your own columns on the right.
- Delete old rows you no longer need, for example after a year. If a customer asks you to delete their details, delete their row and the related emails.

## Who to call

Your website contact at the studio:

- Name: **[OWNER TO FILL IN]**
- Phone or text: **[OWNER TO FILL IN]**
- Email: **[OWNER TO FILL IN]**

Call if emails stop arriving, if the website form shows an error, or if anything in the Sheet looks wrong.
