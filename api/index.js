const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('../db');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files when running locally
app.use(express.static(path.join(__dirname, '..')));

// ─────────────────────────────────────────────────────────────
// 1. Dashboard Stats API
// ─────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
    try {
        const totalEnqRes = await db.query('SELECT COUNT(*) as count FROM enquiries');
        const pendingEnqRes = await db.query("SELECT COUNT(*) as count FROM enquiries WHERE status = 'pending'");
        const totalProdRes = await db.query('SELECT COUNT(*) as count FROM products');
        const totalRevRes = await db.query('SELECT COUNT(*) as count FROM reviews');
        const pendingRevRes = await db.query("SELECT COUNT(*) as count FROM reviews WHERE status = 'pending'");

        res.json({
            success: true,
            dbType: process.env.DATABASE_URL ? 'Neon PostgreSQL' : 'Local SQLite',
            stats: {
                totalEnquiries: parseInt(totalEnqRes.rows[0].count, 10),
                pendingEnquiries: parseInt(pendingEnqRes.rows[0].count, 10),
                totalProducts: parseInt(totalProdRes.rows[0].count, 10),
                totalReviews: parseInt(totalRevRes.rows[0].count, 10),
                pendingReviews: parseInt(pendingRevRes.rows[0].count, 10)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin Auth API
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'pooja@2026';
    if (password === adminPassword) {
        res.json({ success: true, token: 'pooja_auth_' + Date.now() });
    } else {
        res.status(401).json({ success: false, error: 'Incorrect Admin Password' });
    }
});

// ─────────────────────────────────────────────────────────────
// 2. Enquiries API
// ─────────────────────────────────────────────────────────────
app.get('/api/enquiries', async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM enquiries ORDER BY created_at DESC';
        let params = [];
        if (status) {
            query = 'SELECT * FROM enquiries WHERE status = $1 ORDER BY created_at DESC';
            params = [status];
        }
        const result = await db.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/enquiries', async (req, res) => {
    try {
        const { name, phone, email, service_type, requirement } = req.body;
        if (!name || !phone || !requirement) {
            return res.status(400).json({ success: false, error: 'Name, phone, and requirement are required.' });
        }

        const result = await db.query(`
            INSERT INTO enquiries (name, phone, email, service_type, requirement)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            name.trim(),
            phone.trim(),
            email ? email.trim() : null,
            service_type || 'General',
            requirement.trim()
        ]);

        res.status(201).json({
            success: true,
            message: 'Enquiry submitted successfully! Our team will get in touch shortly.',
            id: result.lastInsertId
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.patch('/api/enquiries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'contacted', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        await db.query('UPDATE enquiries SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/enquiries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM enquiries WHERE id = $1', [id]);
        res.json({ success: true, message: 'Enquiry deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// 3. Products API
// ─────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM products ORDER BY category, id ASC';
        let params = [];
        if (category) {
            query = 'SELECT * FROM products WHERE category = $1 ORDER BY id ASC';
            params = [category];
        }
        const result = await db.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { category, name, description, icon, color_class, tags, price } = req.body;
        if (!category || !name) {
            return res.status(400).json({ success: false, error: 'Category and name are required.' });
        }

        const result = await db.query(`
            INSERT INTO products (category, name, description, icon, color_class, tags, price)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            category,
            name,
            description || '',
            icon || 'inventory_2',
            color_class || 'ci-blue',
            tags || '',
            price || 'Contact for price'
        ]);

        res.status(201).json({ success: true, id: result.lastInsertId, message: 'Product added successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { category, name, description, icon, color_class, tags, price, in_stock } = req.body;

        await db.query(`
            UPDATE products SET
                category = coalesce($1, category),
                name = coalesce($2, name),
                description = coalesce($3, description),
                icon = coalesce($4, icon),
                color_class = coalesce($5, color_class),
                tags = coalesce($6, tags),
                price = coalesce($7, price),
                in_stock = coalesce($8, in_stock)
            WHERE id = $9
        `, [category, name, description, icon, color_class, tags, price, in_stock, id]);

        res.json({ success: true, message: 'Product updated successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true, message: 'Product deleted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// 4. Reviews API
// ─────────────────────────────────────────────────────────────
app.get('/api/reviews', async (req, res) => {
    try {
        const { all } = req.query;
        let query = "SELECT * FROM reviews WHERE status = 'approved' ORDER BY id DESC";
        if (all === 'true') {
            query = 'SELECT * FROM reviews ORDER BY id DESC';
        }
        const result = await db.query(query);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { name, rating, message, role_company } = req.body;
        if (!name || !rating || !message) {
            return res.status(400).json({ success: false, error: 'Name, rating, and message are required.' });
        }
        const ratingNum = parseInt(rating, 10);
        if (ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
        }

        const result = await db.query(`
            INSERT INTO reviews (name, rating, message, role_company, status)
            VALUES ($1, $2, $3, $4, 'approved')
        `, [
            name.trim(),
            ratingNum,
            message.trim(),
            role_company ? role_company.trim() : 'Customer'
        ]);

        res.status(201).json({ success: true, id: result.lastInsertId, message: 'Thank you! Your review has been submitted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.patch('/api/reviews/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approved', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        await db.query('UPDATE reviews SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true, message: 'Review status updated' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM reviews WHERE id = $1', [id]);
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = app;
