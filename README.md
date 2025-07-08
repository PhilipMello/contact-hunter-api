# 🚀 Contact Hunter API

A fast, lightweight API to **scrape Google Maps businesses** and **extract contact info from websites** (emails, Facebook, Instagram). Designed for integration with **n8n**, personal lead generation tools, or SaaS workflows.

---

# 🚀 Contact Hunter API

A fast, lightweight API to **scrape Google Maps businesses** and **extract contact info from websites** (emails, Facebook, Instagram). Designed for integration with **n8n**, personal lead generation tools, or SaaS workflows.

---

## ✨ Features
✅ Google Maps scraping (business name, phone, website, ratings, reviews)  
✅ Website scraping for emails, Facebook & Instagram links  
✅ API key protection (secure access)  
✅ Blocks unnecessary images/fonts for faster scraping  
✅ Request cancellation supported (stops processing if client disconnects)  

---

## 📦 Installation

### 1️⃣ Clone the repo

git clone https://github.com/yourusername/contacthunter-api.git
cd contacthunter-api
```

### 2️⃣ Install dependencies

npm install
```

### 3️⃣ Configure API key

Create a `.env` file:

cp .env.example .env
nano .env
```
Edit your API key inside `.env`:
```
API_KEY=your_secret_api_key_here
```

### 4️⃣ Start the API

pm2 start app.js --name contacthunter-api
pm2 save
pm2 startup
```

---

## 🛠️ Usage

### 🌐 Google Maps API
- **Endpoint:** `/gmap`
- **Method:** GET
- **Headers:** `api-key: your_secret_api_key_here`
- **Example:**
```
http://your-server-ip:3000/gmap?query=hotels+in+los+angeles&count=5
```

### 🌐 Website Contact Info API
- **Endpoint:** `/website`
- **Method:** GET
- **Headers:** `api-key: your_secret_api_key_here`
- **Example:**
```
http://your-server-ip:3000/website?url=https://www.example.com
```

---

## 🔗 n8n Integration
Use the **HTTP Request** node in n8n:
- **Method:** GET
- **URL:** `http://your-server-ip:3000/gmap`
- **Query Params:** `query=spas+in+los+angeles&count=5`
- **Headers:** `api-key: your_secret_api_key_here`
- Process each business in the response using the **SplitInBatches** or **Loop** node.

---

## ⚡ Tech Stack
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Puppeteer Extra](https://github.com/berstend/puppeteer-extra)
- [PM2](https://pm2.keymetrics.io/)

---

## 📝 License
MIT License – free for personal & commercial use.
