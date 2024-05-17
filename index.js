import puppeteer from "puppeteer";

async function scrapeJobs() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();

    const salaryRanges = ["0-11000", "11000-14000", "14000-17000", "17000-20000", "20000-25000", "25000-30000", "30000-35000", "35000-40000", "40000-50000", "50000-60000", "60000-80000", "80000-120000", "120000-"];
    const currentDate = new Date().toISOString().split('T')[0];

    for (const salaryRange of salaryRanges) {
        let currentPage = 1;
        let totalPages;

        do {
            const url = `https://hk.jobsdb.com/jobs-in-information-communication-technology?daterange=1&page=${currentPage}&salaryrange=${salaryRanges}&salarytype=monthly`;

            await page.goto(url);
            await page.waitForSelector('[data-card-type="JobCard"]');
            totalPages = await page.evaluate(() => {
                const totalJobsCount = document.querySelector('[data-automation="totalJobsCount"]').innerText;
                return Math.ceil(Number(totalJobsCount) / 32);
            });

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

            const jobCards = await page.$$('[data-card-type="JobCard"]');
            const combinedData = [];

            for (const jobCard of jobCards) {
                const jobTitleElement = await jobCard.$('[data-automation="jobTitle"]');
                await jobTitleElement.click();

                await page.waitForSelector('[data-automation="jobAdDetails"]');

                const detailData = await page.evaluate(() => {
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

                const combinedItem = {
                    date: currentDate,
                    salaryRange: salaryRange,
                    jobCardData: jobCardData.shift(),
                    detailData: detailData.shift()
                };
                combinedData.push(combinedItem);
            }
            console.log(combinedData);

            currentPage++;
        } while (currentPage <= totalPages)
    }

    await browser.close();
}

await scrapeJobs();
