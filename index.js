import puppeteer from "puppeteer";

async function scrapeJobs() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();

    let currentPage = 1;
    let totalPages = 2;

    while (currentPage <= totalPages) {
        const url = `https://hk.jobsdb.com/jobs-in-information-communication-technology?daterange=3&page=${currentPage}&salaryrange=0-14000&salarytype=monthly`;

        await page.goto(url);
        await page.waitForSelector('[data-card-type="JobCard"]');
        totalPages = await page.evaluate(() => {
            const totalJobsCount = document.querySelector('[data-automation="totalJobsCount"]').innerText;
            return Math.ceil(Number(totalJobsCount) / 32); // 使用实际总工作数计算页数
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

            const combinedItem = { jobCardData: jobCardData.shift(), detailData: detailData.shift() };
            combinedData.push(combinedItem);
        }
        console.log(combinedData);

        currentPage++;

    }

    await browser.close();
}

// 获取当前时间
const now = new Date();
// 计算距离明天11:50的时间间隔
const delay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 8, 0, 0) - now;

// 延迟执行scrapeJobs函数
setTimeout(async () => {
    await scrapeJobs();
}, delay);
