import express from "express";
import puppeteer from "puppeteer";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const baseUrl = `https://jobsdb-scraping-nodejs.onrender.com`; // 生产环境

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send("Server is running");
});

// 处理重试逻辑的函数
async function fetchWithRetries(fn, retries = 3) {
    try {
        return await fn();
    } catch (error) {
        if (error.message.includes("detached") && retries > 0) {
            console.warn(`Retrying due to detached frame: ${error}`);
            return fetchWithRetries(fn, retries - 1);
        } else {
            throw error;
        }
    }
}

// 处理 Puppeteer 页面导航失败的函数
async function safeGoto(page, url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}: Navigating to ${url}`);
            await page.goto(url, { timeout: 300000, waitUntil: "domcontentloaded" });
            return;
        } catch (error) {
            console.error(`Error loading page (Attempt ${attempt}): ${error.message}`);
            if (attempt === maxRetries) throw error;
        }
    }
}

// 主爬虫函数
async function scrapeJobs() {
    const salaryRanges = ["20000-25000"];
    const currentDate = new Date().toISOString().split("T")[0];

    for (const salaryRange of salaryRanges) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--disable-gpu",
                ],
                defaultViewport: { width: 1280, height: 800 },
                protocolTimeout: 300000, // 设置 Puppeteer 全局超时时间
            });

            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(300000); // 设置页面导航超时
            let currentPage = 1;
            let totalPages;
            let jobCounts = {
                javaCount: 0,
                pythonCount: 0,
                javaScriptCount: 0,
                typeScriptCount: 0,
                reactJsCount: 0,
                vueJsCount: 0,
                springCount: 0,
                nodeJsCount: 0,
                mySqlCount: 0,
                noSqlCount: 0,
            };

            let jobCount = 0;
            let countItem;

            do {
                const url = `https://hk.jobsdb.com/jobs-in-information-communication-technology?daterange=1&page=${currentPage}&salaryrange=${salaryRange}&salarytype=monthly&sortmode=ListedDate`;

                try {
                    await fetchWithRetries(async () => {
                        await safeGoto(page, url);
                        await page.waitForFunction(() => {
                            return document.querySelectorAll('[data-card-type="JobCard"]').length > 0;
                        }, { timeout: 300000 });
                    });

                    totalPages = await page.evaluate(() => {
                        const totalJobsCount = document.querySelector('[data-automation="totalJobsCount"]').innerText;
                        return Math.ceil(Number(totalJobsCount) / 32);
                    });

                    const jobCards = await page.$$('[data-card-type="JobCard"]');
                    const combinedData = [];

                    for (const jobCard of jobCards) {
                        const jobTitleElement = await jobCard.$('[data-automation="jobTitle"]');
                        if (!jobTitleElement) continue;

                        await page.waitForTimeout(1000); // 避免点击太快
                        await jobTitleElement.click();
                        await page.waitForSelector('[data-automation="jobAdDetails"]', { timeout: 300000 });

                        const detailData = await page.evaluate(() => {
                            const jobDetail = document.querySelector('[data-automation="jobAdDetails"]');
                            return jobDetail ? { jobAdDetails: jobDetail.innerText.trim() } : {};
                        });

                        const jobDescription = detailData?.jobAdDetails?.toLowerCase().replace(/\s+/g, "");

                        if (jobDescription.includes("java")) jobCounts.javaCount++;
                        if (jobDescription.includes("python")) jobCounts.pythonCount++;
                        if (jobDescription.includes("javascript")) jobCounts.javaScriptCount++;
                        if (jobDescription.includes("typescript")) jobCounts.typeScriptCount++;
                        if (jobDescription.includes("reactjs")) jobCounts.reactJsCount++;
                        if (jobDescription.includes("vuejs")) jobCounts.vueJsCount++;
                        if (jobDescription.includes("spring")) jobCounts.springCount++;
                        if (jobDescription.includes("nodejs")) jobCounts.nodeJsCount++;
                        if (jobDescription.includes("mysql")) jobCounts.mySqlCount++;
                        if (jobDescription.includes("nosql")) jobCounts.noSqlCount++;

                        const combinedItem = {
                            date: currentDate,
                            salaryRange: salaryRange,
                            ...detailData,
                        };
                        combinedData.push(combinedItem);
                    }

                    jobCount += combinedData.length;

                    countItem = {
                        SalaryRange: salaryRange,
                        Total: jobCount,
                        ...jobCounts,
                        date: currentDate,
                    };

                    if (combinedData.length > 0) {
                        try {
                            console.log(`Calling API ${salaryRange}-page-${currentPage}....`);
                            await axios.post(`${baseUrl}/v1/job-detail-list`, combinedData, {
                                headers: { "Content-Type": "application/json" },
                            });
                            console.log(`Successfully added ${salaryRange}-page-${currentPage} to server`);
                        } catch (err) {
                            console.error(`Failed to send job details: ${err}`);
                        }
                    }

                    currentPage++;
                } catch (error) {
                    console.error(`Error during scraping: ${error}`);
                    break;
                }
            } while (currentPage <= totalPages);

            if (countItem) {
                try {
                    console.log(`Calling count API`);
                    await axios.post(`${baseUrl}/v1/job-count`, countItem, {
                        headers: { "Content-Type": "application/json" },
                    });
                    console.log(`Successfully added count`);
                } catch (err) {
                    console.error(`Failed to send job count: ${err}`);
                }
            }
        } catch (err) {
            console.error(`Failed to initialize Puppeteer: ${err}`);
        } finally {
            if (browser) {
                await browser.close();
                console.log("Browser closed");
            }
        }
    }
}

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});

// 服务器启动时运行爬取任务
scrapeJobs();

// 设置定时任务，每 24 小时运行一次
setInterval(async () => {
    console.log("Running scraping task");
    await scrapeJobs();
}, 24 * 60 * 60 * 1000);
