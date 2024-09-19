import express from "express";
import puppeteer from "puppeteer";
import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const baseUrl = `https://jobsdb-scraping-nodejs.onrender.com`;

app.use(express.json());

app.post("/v1/job-detail-list", (req, res) => {
    const jobDetails = req.body;
    console.log("Received job details:", jobDetails);
    res.status(200).send("Job details received");
});

app.post("/v1/job-count", (req, res) => {
    const jobCount = req.body;
    console.log("Received job count:", jobCount);
    res.status(200).send("Job count received");
});

async function scrapeJobs() {
    let browser;
    try {
        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: true, // 在本地调试时设为 false
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--remote-debugging-port=9222'
            ],
            defaultViewport: {
                width: 1280,
                height: 800,
            },
            protocolTimeout: 1200000, // 设置超时为 20 分钟
        });

        const page = await browser.newPage();
        const salaryRanges = ["0-11000", "11000-14000", "14000-17000", "17000-20000", "20000-25000", "25000-30000", "30000-35000", "35000-40000", "40000-50000", "50000-60000", "60000-80000", "80000-120000", "120000-"];
        const currentDate = new Date().toISOString().split("T")[0];

        const fetchWithRetries = async (fn, retries = 3) => {
            try {
                return await fn();
            } catch (error) {
                if (retries > 0) {
                    console.warn(`Retrying due to error: ${error}`);
                    return fetchWithRetries(fn, retries - 1);
                } else {
                    throw error;
                }
            }
        };

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

                try {
                    await fetchWithRetries(() => page.goto(url, { timeout: 1200000 }));
                    await fetchWithRetries(() => page.waitForSelector('[data-card-type="JobCard"]', { timeout: 1200000 }));

                    totalPages = await page.evaluate(() => {
                        const totalJobsCount = document.querySelector('[data-automation="totalJobsCount"]').innerText;
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
                        const jobTitleElement = await jobCard.$('[data-automation="jobTitle"]');
                        await jobTitleElement.click();

                        await fetchWithRetries(() => page.waitForSelector('[data-automation="jobAdDetails"]', { timeout: 1200000 }));

                        const detailData = await page.evaluate(() => {
                            const jobDetail = document.querySelectorAll('[data-automation="jobAdDetails"]');
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

                        const jobDescription = detailData[0]?.["jobAdDetails"].toLowerCase().replace(/\s+/g, "");

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
                        console.log(`Successfully added ${salaryRange}-page-${currentPage} to server`);
                    } catch (err) {
                        console.error(`Error calling detail list API: ${err}`);
                    }
                    currentPage++;
                } catch (error) {
                    console.error(`Error during scraping: ${error}`);
                    break; // Exit the loop if an error occurs
                }
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
                console.error(`Error calling count API: ${err}`);
            }
        }
    } catch (err) {
        console.error(`Failed to initialize Puppeteer: ${err}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Set server to listen first, which allows it to handle requests immediately
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Run the scraping task once upon server startup
await scrapeJobs();

// Set a daily interval for the scraping task
setInterval(async () => {
    console.log("Running scraping task");
    await scrapeJobs();
}, 24 * 60 * 60 * 1000); // 24 hours

// Keep the server active
setInterval(() => {
    console.log("Script is running to stay active...");
}, 600000);
