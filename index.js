async function scrapeJobs() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
            ],
            defaultViewport: {
                width: 1280,
                height: 800,
            },
            protocolTimeout: 60000, // 增加到 60 秒
        });

        const page = await browser.newPage();

        page.on('framenavigated', frame => {
            if (frame.url() !== url) {
                console.warn(`检测到页面导航: ${frame.url()}`);
            }
        });

        page.on('dialog', async dialog => {
            console.log(`对话框消息: ${dialog.message()}`);
            await dialog.dismiss(); // 或者 dialog.accept();
        });

        const fetchWithRetries = async (fn, retries = 3) => {
            try {
                return await fn();
            } catch (error) {
                if (retries > 0) {
                    console.warn(`重试由于错误: ${error}`);
                    return fetchWithRetries(fn, retries - 1);
                } else {
                    throw error;
                }
            }
        };

        for (const salaryRange of salaryRanges) {
            let currentPage = 1;
            let totalPages;
            let jobCount = 0;
            let countItem;

            do {
                const url = `https://hk.jobsdb.com/jobs-in-information-communication-technology?daterange=1&page=${currentPage}&salaryrange=${salaryRange}&salarytype=monthly&sortmode=ListedDate`;

                try {
                    await fetchWithRetries(() => page.goto(url, { timeout: 60000 }));
                    await fetchWithRetries(() => page.waitForSelector('[data-card-type="JobCard"]', { timeout: 60000 }));

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

                        await fetchWithRetries(() => page.waitForSelector('[data-automation="jobAdDetails"]', { timeout: 60000 }));

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

                        // Count occurrences
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
                        console.log(`调用 API ${salaryRange}-page-${currentPage}....`);
                        await axios.post(`${baseUrl}/v1/job-detail-list`, combinedData, {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        });
                        console.log(`成功添加 ${salaryRange}-page-${currentPage} 到服务器`);
                    } catch (err) {
                        console.error(`调用详细列表 API 错误: ${err}`);
                    }
                    currentPage++;
                } catch (error) {
                    console.error(`抓取过程中出现错误: ${error}`);
                    break; // 如果发生错误则退出循环
                }
            } while (currentPage <= totalPages);

            try {
                console.log(`调用计数 API`);
                await axios.post(`${baseUrl}/v1/job-count`, countItem, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                console.log(`成功添加计数`);
            } catch (err) {
                console.error(`调用计数 API 错误: ${err}`);
            }
        }
    } catch (err) {
        console.error(`初始化 Puppeteer 失败: ${err}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 设置服务器监听，允许它立即处理请求
app.listen(port, () => {
    console.log(`服务器正在运行在 http://localhost:${port}`);
});

// 启动时运行抓取任务
await scrapeJobs();

// 设置每日间隔来运行抓取任务
setInterval(async () => {
    console.log("运行抓取任务");
    await scrapeJobs();
}, 24 * 60 * 60 * 1000); // 24 小时

// 保持服务器活跃
setInterval(() => {
    console.log("脚本正在运行以保持活跃...");
}, 600000); // 10 分钟
