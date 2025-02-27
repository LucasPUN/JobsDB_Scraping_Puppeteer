# Job Scraping with Puppeteer and Express

## Overview
This project is an automated job scraper that uses **Puppeteer** to extract job listings from **JobsDB** in real time. The scraped data is then sent to an external API for storage and analysis. The project is built using **Node.js**, **Express**, **Puppeteer**, and **Axios**.

## Features
- Scrapes job listings from JobsDB based on salary range.
- Uses **Puppeteer Stealth Plugin** to avoid bot detection.
- Extracts job titles, descriptions, and relevant job details.
- Categorizes job listings based on technologies (e.g., Java, Python, React, etc.).
- Sends extracted data to an external API for storage and further analysis.
- Runs automatically at server startup and on a daily schedule.

## Technologies Used
- **Node.js** – Backend framework
- **Express** – Web server
- **Puppeteer** – Headless browser automation
- **Puppeteer Stealth Plugin** – Bypassing bot detection
- **Axios** – HTTP requests to external API
- **dotenv** – Environment variable management

## Setup & Installation
### Prerequisites
Ensure you have the following installed:
- **Node.js** (v16+ recommended)
- **npm** or **yarn**

### Installation Steps
1. Clone this repository:
   ```sh
   git clone https://github.com/LucasPUN/JobsDB_Scraping_Puppeteer.git
   cd JobsDB_Scraping_Puppeteer
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and configure:
   ```env
   PORT=4000
   BASE_URL=https://jobsdb-scraping-nodejs.onrender.com
   ```
4. Run the project:
   ```sh
   npm start
   ```

## How It Works
1. The server starts on the specified port (`4000` by default).
2. The scraper visits JobsDB, searches for job listings based on salary range, and extracts relevant information.
3. Extracted data is sent to an external API endpoint (`/v1/job-detail-list`).
4. A job count summary is also sent to another API endpoint (`/v1/job-count`).
5. The scraping task runs automatically at server startup and repeats every 24 hours.

## API Endpoints
- `GET /` – Check if the server is running.
- `POST /v1/job-detail-list` – Sends scraped job details.
- `POST /v1/job-count` – Sends job count summary.

## Error Handling & Retries
- Implements a **retry mechanism** to handle detached frame errors.
- Uses `try-catch` blocks to handle Puppeteer navigation timeouts.

## Deployment
This project can be deployed on platforms like **Render, Heroku, or AWS EC2**. To deploy:
1. Install **Docker** and create a Dockerfile.
2. Push to a cloud service and configure environment variables.

## Future Enhancements
- Add support for more job filters (location, experience level, etc.).
- Store scraped data in a database (MongoDB or PostgreSQL).
- Implement a web dashboard to visualize job trends.

## License
MIT License

---

For any issues or contributions, feel free to open a pull request!

