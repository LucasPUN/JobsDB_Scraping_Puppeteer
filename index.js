import puppeteer from "puppeteer";
import * as fs from "node:fs";
import axios from "axios";
import cron from "node-cron";

const baseUrl = "https://jobsdb-scraping-nodejs.onrender.com";

const express = require('express')
const app = express()
const port = process.env.PORT || 4000;

async function scrapeJobs() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    });

    const page = await browser.newPage();
    const salaryRanges = ["17000-20000", "20000-25000"];
    // const salaryRanges = ["0-11000", "11000-14000", "14000-17000", "17000-20000", "20000-25000", "25000-30000", "30000-35000", "35000-40000", "40000-50000", "50000-60000", "60000-80000", "80000-120000", "120000-"];
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

                await page.waitForSelector('[data-automation="jobAdDetails"]');

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

                // 统计关键字出现次数
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
            // console.log(`Java count: ${javaCount}`);
            // console.log(`JavaScript count: ${javaScriptCount}`);
            // console.log(`ReactJS count: ${reactJsCount}`);

            try {
                console.log(`Calling API ${salaryRange}-page-${currentPage}....`);
                await axios.post(
                    `${baseUrl}/v1/job-detail-list`,
                    JSON.stringify(combinedData),
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
                console.log(`Successfully added ${salaryRange}-page-${currentPage} to server`);
            } catch (err) {
                console.error(err);
            }
            currentPage++;
        } while (currentPage <= totalPages);

        try {
            console.log(`Calling count API `);
            await axios.post(
                `${baseUrl}/v1/job-count`,
                JSON.stringify(countItem),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            console.log(`Successfully added count`);
        } catch (err) {
            console.error(err);
        }
    }

    await browser.close();
}

setInterval(() => {
    console.log("脚本正在运行，保持活跃状态...");
}, 10000);

// 使用cron调度任务，每天中午12:00运行
cron.schedule("50 11 * * *", () => {
    console.log("在每天中午12点运行爬虫任务");
    scrapeJobs();
});
