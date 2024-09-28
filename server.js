const express = require('express');
const path = require('path');
const { automateBrowsing, validateEmails } = require('./api/Scrap'); // Import validateEmails

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'gui' directory
app.use(express.static(path.join(__dirname, 'gui')));

// Handle form submission and scraping
app.post('/scrape-google', async (req, res) => {
  const { keyword, numPages, validate } = req.body; // Add validate to the destructuring

  try {
    const scrapedEmails = await automateBrowsing(keyword, numPages); // Scraping function

    let validationResults = { validEmails: [], invalidEmails: [] };

    // Only validate if the checkbox was checked
    if (validate === 'true') {
      // Validate the scraped emails if the checkbox was checked
      validationResults = await validateEmails(scrapedEmails);
    } else {
      // If not validated, all emails are considered valid
      validationResults.validEmails = scrapedEmails;
    }

    // Pass the validation results to the results page as a query parameter (URL encoded)
    const results = {
      validEmails: validationResults.validEmails.join(','),
      invalidEmails: validationResults.invalidEmails.join(','),
    };

    res.redirect(`/validate_result_page.html?validEmails=${encodeURIComponent(results.validEmails)}&invalidEmails=${encodeURIComponent(results.invalidEmails)}`);
  } catch (error) {
    console.error(`Error during scraping: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'An error occurred during the scraping process.' });
  }
});



// Start the server
const PORT = process.env.PORT || 2001;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
