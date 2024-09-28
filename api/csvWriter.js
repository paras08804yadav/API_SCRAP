const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
  path: 'scraped_emails.csv',
  header: [{ id: 'email', title: 'Email' }]
});

const writeEmailsToCSV = async (emails) => {
  const records = emails.map(email => ({ email }));
  try {
    await csvWriter.writeRecords(records);
    console.log('CSV file has been created successfully.');
  } catch (error) {
    console.error('Error writing to CSV:', error);
  }
};

module.exports = { writeEmailsToCSV };

