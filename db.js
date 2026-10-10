const path = require('path');
require('dotenv').config();

const isPostgres = !!process.env.DATABASE_URL;

let dbClient = null;

if (isPostgres) {
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    dbClient = {
        type: 'postgres',
        async query(text, params = []) {
            return pool.query(text, params);
        }
    };
} else {
    // Local SQLite fallback
    let Database;
    try {
        Database = require('better-sqlite3');
    } catch (e) {
        Database = null;
    }

    if (Database) {
        const sqliteDb = new Database(path.join(__dirname, 'pooja_store.db'));
        sqliteDb.pragma('journal_mode = WAL');

        dbClient = {
            type: 'sqlite',
            async query(text, params = []) {
                // Convert PostgreSQL $1, $2 parameter placeholders to SQLite ? placeholders
                let sqliteSql = text.replace(/\$(\d+)/g, '?');
                const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');

                if (isSelect) {
                    const rows = sqliteDb.prepare(sqliteSql).all(...params);
                    return { rows, rowCount: rows.length };
                } else {
                    const info = sqliteDb.prepare(sqliteSql).run(...params);
                    return {
                        rows: [],
                        rowCount: info.changes,
                        lastInsertId: info.lastInsertRowid
                    };
                }
            }
        };
    }
}

// Schema Initializer & Seeder
async function initSchema() {
    if (!dbClient) return;

    if (dbClient.type === 'postgres') {
        // Neon PostgreSQL Schema
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS enquiries (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255),
                service_type VARCHAR(100) DEFAULT 'General',
                requirement TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                icon VARCHAR(50) DEFAULT 'inventory_2',
                color_class VARCHAR(50) DEFAULT 'ci-blue',
                tags VARCHAR(255) DEFAULT '',
                price VARCHAR(100) DEFAULT 'Contact for price',
                in_stock INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                message TEXT NOT NULL,
                role_company VARCHAR(255),
                status VARCHAR(50) DEFAULT 'approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check and seed initial products
        const prodCountRes = await dbClient.query('SELECT COUNT(*) as count FROM products');
        if (parseInt(prodCountRes.rows[0].count, 10) === 0) {
            const seedProducts = [
                ['office', 'Copier & Printing Paper', 'JK Copier, Bilt Matrix, B2B paper in 70, 75 & 80 GSM. Available in A4, FS, A3 sizes.', 'description', 'ci-blue', 'JK Copier, A4 / A3 / FS, Bulk Carton', 'Wholesale Rates'],
                ['office', 'Files & Folders', 'Box files, ring binders, spring files, cobra files, clear bags & display books.', 'folder_open', 'ci-blue', 'Box Files, Ring Binders, L-Folders', 'Contact for rates'],
                ['office', 'Writing & Correction', 'Ball pens, gel pens, permanent markers, highlighters, white-out & correction tapes.', 'edit', 'ci-blue', 'Cello, Reynolds, Faber-Castell', 'Retail & Bulk'],
                ['office', 'Desk Accessories', 'Staplers, punching machines, calculators, paper cutters, scissors, sticky notes & tape dispensers.', 'dashboard', 'ci-blue', 'Kangaro, Casio, 3M Post-it', 'Best Price'],
                ['school', 'Notebooks & Registers', 'Single line, four line, square, drawing books, long books, registers & spiral note pads.', 'auto_stories', 'ci-red', 'Classmate, Navneet, Sundaram', 'Discounted MRP'],
                ['school', 'Art & Craft Materials', 'Poster colors, sketch pens, acrylic paints, paintbrushes, clay, craft papers & origami.', 'palette', 'ci-red', 'Faber-Castell, Camlin, Doms', 'Full Range'],
                ['school', 'Geometry & Math Kits', 'Geometry boxes, compass, protractor, scales, engineering templates & graph papers.', 'square_foot', 'ci-red', 'Camlin, Maped, Faber-Castell', 'All Standards'],
                ['school', 'School Bags & Pencil Pouches', 'Backpacks, pouches, pencil boxes, water bottles & tiffin boxes for nursery to college.', 'backpack', 'ci-red', 'Quality Bags, Pouches, Bottles', 'Latest Collection'],
                ['toys', 'Board Games & Puzzles', 'Ludo, Chess, Carrom, Scrabble, Business, jigsaw puzzles and brain development games.', 'casino', 'ci-orange', 'Chess, Ludo, Scrabble, Carrom', 'All Ages'],
                ['toys', 'Educational & STEM Toys', 'Building blocks, alphabet & math puzzle mats, science kits & learning flash cards.', 'extension', 'ci-orange', 'Building Blocks, Puzzle Mats', 'Safe Non-Toxic'],
                ['toys', 'Action Figures & Vehicles', 'Die-cast cars, remote control vehicles, action figures, superhero toys & play sets.', 'sports_esports', 'ci-orange', 'Die-Cast Cars, RC Cars, Sets', 'Top Brands'],
                ['toys', 'Soft Toys & Return Gifts', 'Plush teddy bears, stuffed toys, birthday party return gift sets & novelty items.', 'redeem', 'ci-orange', 'Plush Toys, Birthday Return Gifts', 'Bulk Discounts'],
                ['computer', 'Toner Cartridges & Inks', 'Original and compatible toner cartridges for HP, Canon, Epson, Ricoh & Samsung.', 'print', 'ci-green', 'HP, Canon, Ricoh, Epson', 'Genuine & Compatible'],
                ['computer', 'Keyboard, Mouse & Cables', 'Wired and wireless keyboard-mouse combos, HDMI cables, USB hubs, LAN patch cables.', 'mouse', 'ci-green', 'Logitech, Dell, Zebronics', 'Warranty Included'],
                ['computer', 'Storage & Accessories', 'Pen drives, external hard disks, memory cards, laptop cleaning kits & mouse pads.', 'storage', 'ci-green', 'SanDisk, Kingston, Seagate', '16GB to 2TB'],
                ['computer', 'Spiral & Lamination Materials', 'Lamination pouches (ID card to A3 size), spiral coils, wiro rings & transparent sheet covers.', 'layers', 'ci-green', 'Pouches, Wiro, Spiral Coils', 'Direct Wholesale'],
                ['housekeeping', 'Cleaning Liquids & Floor Cleaners', 'Floor cleaners, surface disinfectants, glass cleaners, toilet cleaners & sanitizers in 5L cans.', 'sanitizer', 'ci-grey', 'Lizol, Harpic, Collin, 5L Cans', 'Institutional Bulk'],
                ['housekeeping', 'Tissue Papers & Dispensers', 'M-Fold tissues, C-fold towels, toilet rolls, facial tissue boxes & automatic dispensers.', 'clean_hands', 'ci-grey', 'M-Fold, Toilet Rolls, Boxes', 'Carton Packing'],
                ['housekeeping', 'Trash Bags & Bins', 'Black & coloured garbage bags in small, medium, large & extra large with dustbins.', 'delete_outline', 'ci-grey', 'Bio-Hazard, Black, Heavy Duty', 'All Sizes'],
                ['housekeeping', 'Room Fresheners & Hand Wash', 'Automatic aerosol dispensers, spray air fresheners, liquid hand washes in 5L packs.', 'air', 'ci-grey', 'Godrej Aer, Lifebuoy, Odonil', 'Long Lasting']
            ];

            for (const p of seedProducts) {
                await dbClient.query(`
                    INSERT INTO products (category, name, description, icon, color_class, tags, price)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, p);
            }
        }

        // Check and seed reviews
        const revCountRes = await dbClient.query('SELECT COUNT(*) as count FROM reviews');
        if (parseInt(revCountRes.rows[0].count, 10) === 0) {
            const seedReviews = [
                ['Rajesh Kumar', 5, 'Excellent service and quick delivery. I always order my office stationery from here. Highly recommended for corporate supplies.', 'Corporate Client'],
                ['Priya Sharma', 5, 'One stop shop for all school projects. The staff is very helpful and they have everything my kids need.', 'Parent & Customer'],
                ['Amit Patel', 4, 'Good quality Xerox and printing services. Very reasonable rates compared to others in Andheri East.', 'Local Business Owner'],
                ['Suresh Nair', 5, 'Very reliable for bulk orders. We have been purchasing our office housekeeping material and photocopier service from Pooja Computers for 2 years now.', 'Admin Manager, MIDC'],
                ['Neha Gupta', 5, 'Best place for art supplies. Found all the specific sketching pencils and papers I needed which were not available nearby.', 'Graphic Designer'],
                ['Rohan Mehta', 5, 'Very friendly behavior by Dharmendra ji. They always guide properly about which product is best for my office requirements.', 'IT Consultant'],
                ['Sneha Desai', 4, 'Prices are very reasonable compared to online. Plus you get to check the quality before buying. Good variety of pens and registers.', 'Teacher']
            ];

            for (const r of seedReviews) {
                await dbClient.query(`
                    INSERT INTO reviews (name, rating, message, role_company, status)
                    VALUES ($1, $2, $3, $4, 'approved')
                `, r);
            }
        }
    }
}

let initPromise = null;
function getDb() {
    if (!initPromise) {
        initPromise = initSchema().catch(err => {
            console.error('Database schema init error:', err);
        });
    }
    return dbClient;
}

module.exports = {
    getDb,
    query: async (text, params) => {
        const client = getDb();
        if (initPromise) await initPromise;
        return client.query(text, params);
    }
};
