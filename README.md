# email-tracking

## Project Outline 

Leverage upon existing AWS technologies - SES and SNS to build an email tracking system

Utilize SES' configuration set function to enable tracking of desired email activity such as Opens, Clicks etc. 

Email activity can be piped to a destination of your choice - SNS, Kinesis or CloudWatch. In this case, SNS + HTTPS POST was used. 

Kinesis + Firehose is pretty straightforward to setup as well and can be used to write all the activity to s3. As a subsequent step, Athena can be used to analyze the logs