const { chromium } = require('playwright');
const axios = require('axios');
const { writeEmailsToCSV } = require('./csvWriter');
const { proxyFetchUrl } = require('../settings/config');
const logger = require('../settings/logger');

// Function to fetch proxy using provided URL
const fetchProxy = async () => {
    try {
        const response = await axios.get(proxyFetchUrl);
        const proxy = response.data.trim();
        logger.info(`Fetched proxy: ${proxy}`);
        return proxy;
    } catch (error) {
        logger.error('Error fetching proxy:', error);
        throw error;
    }
};

// Function to extract emails from the page content
const extractEmails = (content) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let emails = content.match(emailRegex) || [];
    return emails.filter(email => !email.includes('%'));
};

// Function to validate emails
const validateEmails = async (emails) => {
  try {
      // Log emails being sent for validation in comma-separated string format
      logger.info(`Validating emails: ${emails.join(',')}`);

      const response = await axios.post('http://localhost:3000/verify-emails', {
          emails: emails.join(',') // Send as a comma-separated string
      });

      // Log response from validation server
      logger.info(`Validation response received: ${JSON.stringify(response.data)}`);
      return response.data; // Return the validation results
  } catch (error) {
      logger.error(`Error validating emails: ${error.message}`);

      // Safely handle if error.response is not defined
      if (error.response) {
          logger.error(`Error details: ${JSON.stringify(error.response.data)}`);
      } else {
          logger.error(`No response received from validation server`);
      }

      return { validEmails: [], invalidEmails: [] }; // Return empty arrays on error
  }
};


// Main function to automate browsing
const automateBrowsing = async (keyword, numPages) => {
    let allEmails = [];
    let pageNumber = 1;
    let proxy = await fetchProxy();

    while (pageNumber <= numPages) {
        try {
            const browser = await chromium.launch({
                headless: true,
                proxy: { server: `http://${proxy}` }
            });

            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${(pageNumber - 1) * 10}`, {
                waitUntil: 'domcontentloaded', // Wait until the DOM is fully loaded
            });

            const content = await page.content();
            const emailsOnPage = extractEmails(content);
            allEmails.push(...emailsOnPage);

            logger.info(`Extracted emails from page ${pageNumber}: ${emailsOnPage.length}`);
            pageNumber++;
            await browser.close();
        } catch (error) {
            logger.error(`Error during browsing on page ${pageNumber}: ${error.message}`);
            logger.info('Fetching a new proxy and retrying...');
            proxy = await fetchProxy();
        }
    }

    const uniqueEmails = [...new Set(allEmails)];
    await writeEmailsToCSV(uniqueEmails);

    // Validate the scraped emails
    const validationResults = await validateEmails(uniqueEmails);
    
    logger.info(`Validation results: ${JSON.stringify(validationResults)}`);
    
    return { emails: uniqueEmails, proxiesUsed: proxy, validation: validationResults };
};

module.exports = { automateBrowsing };
