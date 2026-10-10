const app = require('./api/index');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Pooja Computers & Stationery Server running!`);
    console.log(`🌐 Website URL: http://localhost:${PORT}`);
    console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`📦 Database: ${process.env.DATABASE_URL ? 'Neon PostgreSQL' : 'Local SQLite'}`);
    console.log(`====================================================`);
});
