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
    await page.goto('https://hk.jobsdb.com/jobs-in-information-communication-technology?daterange=1');

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


    for (const jobCard of jobCards) {
        await jobCard.click();

        await page.waitForSelector('[data-automation="jobAdDetails"]');

        const detailData = await page.evaluate(() => {
            // Add more fields as needed
            const jobDetail = document.querySelectorAll('[data-automation="jobAdDetails"]');
            const jobDetailData = [];
            const data = {};
            jobDetail.forEach(element => {
                const key = element.getAttribute('data-automation');
                const value = element.innerText.trim();
                data[key] = value;
            });
            jobDetailData.push(data);
            return jobDetailData;
        });

        console.log(detailData);

        // Go back to the job listing page
        // await page.goBack();
    }

    // Close the browser
    // await browser.close();
})();