import nodemailer from 'nodemailer';
import sesTransport from 'nodemailer-ses-transport';
import path from 'path';
import config from '../../config/environment';

const emailTemplate = require('email-templates').EmailTemplate;
const transport = decideTransport();
/**
 * @api {post} /api/email/send SEND email
 * @apiVersion 1.0.0
 * @apiName Send Email
 * @apiGroup Send
 * @apiPermission internal
 * @apiDescription API for sending email from microservice
 *
 * @apiParam {String}       recipient           Main recepient's email. Can be a comma delimited array as well.
 * @apiParam {String}       otherRecipient.cc   Cc email. Can be a comma delimited array as well.
 * @apiParam {String}       otherRecipient.bcc  Bcc's email. Can be a comma delimited array as well.
 * @apiParam {String}       sender              Sender's email
 * @apiParam {String}       subject             Email subject
 * @apiParam {Object}       message             Message object
 * @apiParam {String}       message.template    The template to use for the email
 * @apiParam {Object}       message.locals      Locals to be injected into the email. Rendering is done using ejs
 * @apiParam {String}       message.HTML        Pass in raw HTML for the HTML. Choose either lemplate + locals OR HTML
 * @apiParam {Object}       [options]           Options object. Unused for now
 *
 * @apiSuccess {String}  status          (success/failure)
 * @apiSuccess {String}  message         Status message
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": success,
 *         "message": {
 *              "from": "update@co-hire.com',
 *              "to": "davidyong12@gmail.com",
 *              "messageId": "0101015a26c91bf6-5eae4dab-b9ef-44ac-a7cc-957444257d1a-000000@us-west-2.amazonses.com"
 *          }
 *     }
 */
exports.postSend = async (req, res) => {
  try {
    const emailDetails = Object.assign({}, 
      { to: req.body.recipient || null },
      { cc: (req.body.otherRecipient || {}).cc || null },
      { bcc: (req.body.otherRecipient || {}).bcc || null },
      { sender: req.body.sender },
      { subject: addEnvToSubject(req.body.subject) },
      { rawHTML: req.body.message.HTML || null },
      { templateChoice: req.body.message.template || null },
      { doNotTrack: req.body.doNotTrack || false }, // add ability to turn off tracking
      { locals: req.body.message.locals || null },
    );

    if (emailDetails.rawHTML) return sendEmail(emailDetails);
    emailDetails.htmlOutput = await renderOutput(emailDetails);
    const response = await sendEmail(emailDetails);
    return res.status(201).json(processResponse(response));
  } catch (err) {
    console.error(err);
    res.status(500).json(err); // application is internal anyways
  }
};

// promisified rendering function
function renderOutput(emailDetails) {
  return new Promise((resolve, reject) => {
    const templateDir = path.join(__dirname, 'templates_v2_compiled');
    const template = new emailTemplate(path.join(templateDir, emailDetails.templateChoice));

    template.render(emailDetails.locals, (e, result) => {
      if (e) {
        console.errror(e);
        reject(e);
      } else {
        resolve(result.html);
      }
    });
  });
}

// email sending leverages upon nodemailer
function sendEmail(emailDetails) {
  return new Promise((resolve, reject) => {
    const sendEmailObject = {
      from: emailDetails.sender,
      to: emailDetails.to,
      cc: emailDetails.cc,
      bcc: emailDetails.bcc,
      subject: emailDetails.subject,
      html: emailDetails.htmlOutput,
      headers: emailDetails.headers,
    };

    transport.sendMail(sendEmailObject, (err, response) => {
      if (err) return reject(err);
      return resolve(response);
    });
  });
}

// clean-up response
function processResponse(response) {
  const x = {
    messageId: response.messageId,
    from: response.envelope.from,
    to: response.envelope.to,
  }
  return x;
}

// check once and declare in global scope
function decideTransport() {
  if (process.env.TRANSPORT_TYPE === 'SES') {
    const transport = nodemailer.createTransport(sesTransport({
      accessKeyId: config.AWS.key,
      secretAccessKey: config.AWS.secret,
      region: config.AWS.region,
    }));
    return transport;
  } else if (process.env.TRANSPORT_TYPE === 'MAILGUN') {
    const transport = nodemailer.createTransport({
      service: 'Mailgun',
      auth: {
        user: process.env.MAILGUN_SMTP_USER,
        pass: process.env.MAILGUN_SMTP_PASSWORD,
      },
    });
    return transport;
  }
  throw new Error('invalid email service provider defined in .env');
}
