import puppeteer from "puppeteer";

(async () => {
    // Launch a headless browser
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    // Open a new page
    const page = await browser.newPage();

    // Navigate to the desired URL
    await page.goto('https://hk.jobsdb.com/jobs-in-information-communication-technology?subclassification=6287%2C6290&jobId=74922497&type=standout');

    // Wait for the content to load
    await page.waitForSelector('[data-card-type="JobCard"]');

    // Extract inner text of data-automation elements from job cards
    const jobCardData = await page.evaluate(() => {
        const jobCards = document.querySelectorAll('[data-card-type="JobCard"]');
        const jobData = [];
        jobCards.forEach(card => {
            const dataElements = card.querySelectorAll('[data-automation]');
            const data = {};
            data["id"] = card.dataset.jobId;
            dataElements.forEach(element => {
                const key = element.getAttribute('data-automation');
                const value = element.innerText.trim();
                data[key] = value;
            });
            jobData.push(data);
        });
        return jobData;
    });

    // Output the job card data
    console.log(jobCardData);

    const jobCards = await page.$$('[data-card-type="JobCard"]');
    await page.goBack();

    for (const jobCard of jobCards) {
        await jobCard.click();
        await page.waitForNavigation();

        console.log("hihi")
    }

    // Close the browser
    // await browser.close();
})();