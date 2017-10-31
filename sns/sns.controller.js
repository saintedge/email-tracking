import { queryDB } from '../../models/helpermethods';

exports.postSESCallback = async (req, res) => {
  const parsedMessage = JSON.parse(req.parsedBody.Message);
  const actionType = parsedMessage.eventType;
  let emailUUID;
  if (req.parsedBody.Type === 'SubscriptionConfirmation') return res.sendStatus(200);
  for (const header of parsedMessage.mail.headers) {
    if (header.name.toUpperCase() === 'X-SES-MESSAGE-UUID') { // this will depend on the custom headers injected
      emailUUID = header.value;
    }
  }
  // update DB - exact code may vary
  await queryDB(`INSERT INTO your_email_tracking_table (email_tracking_id, action_type) VALUES ($$${emailUUID}$$, $$${actionType}$$)`);
  return res.sendStatus(200); // sns requires a 2XX response
}
