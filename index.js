// Use import statements as required in ES module syntax
import express from "express";
import puppeteer from "puppeteer";
import axios from "axios";
import cron from "node-cron";

// Initialize the Express application
const app = express();
const port = process.env.PORT || 4000;
const baseUrl = `http://localhost:${port}`;

app.use(express.json()); // Middleware to handle JSON requests

// Endpoint to receive job details
app.post("/v1/job-detail-list", (req, res) => {
    const jobDetails = req.body;
    console.log("Received job details:", jobDetails); // Handle job details here (e.g., save to database)
    res.status(200).send("Job details received");
});

// Endpoint to receive job counts
app.post("/v1/job-count", (req, res) => {
    const jobCount = req.body;
    console.log("Received job count:", jobCount); // Handle job count here (e.g., save to database)
    res.status(200).send("Job count received");
});

// Function to start the Puppeteer scraper
async function scrapeJobs() {
    const browser = await puppeteer.launch({
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions'
        ],
        defaultViewport: null,
    });


    const page = await browser.newPage();
    const salaryRanges = ["17000-20000", "20000-25000"];
    const currentDate = new Date().toISOString().split("T")[0];

    for (const salaryRange of salaryRanges) {
        let currentPage = 1;
        let totalPages;
        let javaCount = 0;
        let pythonCount = 0;
        let javaScriptCount = 0;
        let typeScriptCount = 0;
        let reactJsCount = 0;
        let vueJsCount = 0;
        let springCount = 0;
        let nodeJsCount = 0;
        let mySqlCount = 0;
        let noSqlCount = 0;

        let jobCount = 0;
        let countItem;

        do {
            const url = `https://hk.jobsdb.com/jobs-in-information-communication-technology?daterange=1&page=${currentPage}&salaryrange=${salaryRange}&salarytype=monthly&sortmode=ListedDate`;

            await page.goto(url);
            await page.waitForSelector('[data-card-type="JobCard"]');

            totalPages = await page.evaluate(() => {
                const totalJobsCount = document.querySelector(
                    '[data-automation="totalJobsCount"]'
                ).innerText;
                return Math.ceil(Number(totalJobsCount) / 32);
            });

            const jobCardData = await page.evaluate(() => {
                const jobCards = document.querySelectorAll('[data-card-type="JobCard"]');
                const jobData = [];
                jobCards.forEach((card) => {
                    const dataElements = card.querySelectorAll('[data-automation]');
                    const data = {};
                    data["id"] = card.dataset.jobId;
                    dataElements.forEach((element) => {
                        const key = element.getAttribute("data-automation");
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
                const jobTitleElement = await jobCard.$(
                    '[data-automation="jobTitle"]'
                );
                await jobTitleElement.click();

                await page.waitForSelector('[data-automation="jobAdDetails"]');

                const detailData = await page.evaluate(() => {
                    const jobDetail = document.querySelectorAll(
                        '[data-automation="jobAdDetails"]'
                    );
                    const jobDetailData = [];
                    const data = {};
                    jobDetail.forEach((element) => {
                        const key = element.getAttribute("data-automation");
                        const value = element.innerText.trim();
                        data[key] = value;
                    });
                    jobDetailData.push(data);
                    return jobDetailData;
                });

                const jobDescription = detailData[0]
                    ?.["jobAdDetails"]
                    .toLowerCase()
                    .replace(/\s+/g, "");

                // Count occurrences of keywords
                if (jobDescription.includes("java")) javaCount++;
                if (jobDescription.includes("python")) pythonCount++;
                if (jobDescription.includes("javascript")) javaScriptCount++;
                if (jobDescription.includes("typescript")) typeScriptCount++;
                if (jobDescription.includes("reactjs")) reactJsCount++;
                if (jobDescription.includes("vuejs")) vueJsCount++;
                if (jobDescription.includes("spring")) springCount++;
                if (jobDescription.includes("nodejs")) nodeJsCount++;
                if (jobDescription.includes("mysql")) mySqlCount++;
                if (jobDescription.includes("nosql")) noSqlCount++;

                const combinedItem = {
                    date: currentDate,
                    salaryRange: salaryRange,
                    ...jobCardData.shift(),
                    ...detailData.shift(),
                };
                combinedData.push(combinedItem);
            }

            jobCount = jobCount + combinedData.length;

            countItem = {
                SalaryRange: salaryRange,
                Total: jobCount,
                Java: javaCount,
                Python: pythonCount,
                JavaScript: javaScriptCount,
                TypeScript: typeScriptCount,
                ReactJS: reactJsCount,
                VueJs: vueJsCount,
                Spring: springCount,
                NodeJS: nodeJsCount,
                MySQL: mySqlCount,
                NoSQL: noSqlCount,
                date: currentDate,
            };

            try {
                console.log(`Calling API ${salaryRange}-page-${currentPage}....`);
                await axios.post(`${baseUrl}/v1/job-detail-list`, combinedData, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                console.log(
                    `Successfully added ${salaryRange}-page-${currentPage} to server`
                );
            } catch (err) {
                console.error(err);
            }
            currentPage++;
        } while (currentPage <= totalPages);

        try {
            console.log(`Calling count API`);
            await axios.post(`${baseUrl}/v1/job-count`, countItem, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            console.log(`Successfully added count`);
        } catch (err) {
            console.error(err);
        }
    }

    await browser.close();
}

// Keep script active with a regular interval
setInterval(() => {
    console.log("Script is running to stay active...");

}, 60000);

// Schedule the scraping task daily at 12:00 PM
// cron.schedule("51 12 * * *", () => {
//     console.log("Running scraping task at 12:00 PM daily");
//     scrapeJobs();
// });
await scrapeJobs();
setInterval(async () => {
    console.log("Running scraping task");
    await scrapeJobs();
}, 24 * 60 * 60 * 1000); // 24 hours


// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
