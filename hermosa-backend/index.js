const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('Received file:', file);
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
  user: 'postgres',
  host: 'db.bpdfqqvnpjpvrqpgpoqf.supabase.co',
  database: 'postgres',
  password: 'Thesis2025$',
  port: 5432,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', {
    username,
    passwordLength: password?.length,
    timestamp: new Date().toISOString()
  });
  
  try {
    const result = await pool.query(
      'SELECT * FROM staff_tb WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials or role' });

    const user = result.rows[0];
    
    // Check role
    if (user.role !== 'meter handler') {
      console.log('Invalid role. Expected: meter handler, Got:', user.role);
      return res.status(401).json({ error: 'Invalid role for this application' });
    }

    let valid = false;
    const storedHash = user.password;
    
    console.log('Stored hash format:', {
      hash: storedHash.substring(0, 7) + '...',
      format: storedHash.startsWith('$2y$') ? '$2y$' : '$2b$'
    });

    try {
      // Try direct comparison first
      valid = await bcrypt.compare(password, storedHash);
      
      if (!valid && storedHash.startsWith('$2y$')) {
        // If direct comparison failed and it's a $2y$ hash, try with converted hash
        const convertedHash = storedHash.replace('$2y$', '$2b$');
        console.log('Trying converted hash:', convertedHash.substring(0, 7) + '...');
        valid = await bcrypt.compare(password, convertedHash);
      }

      console.log('Password validation result:', valid);
    } catch (error) {
      console.error('Password comparison error:', error);
      valid = false;
    }

    if (!valid) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/customers', async (req, res) => {
  try {
    const customersResult = await pool.query(
      'SELECT name, address, meter_number, customer_type FROM customers_tb'
    );
    const customers = customersResult.rows;

    // Get all readings for the current month
    const readingsResult = await pool.query(
      `SELECT meter_number FROM meter_readings
       WHERE DATE_TRUNC('month', reading_date) = DATE_TRUNC('month', CURRENT_DATE)`
    );
    const doneMeterNumbers = new Set(readingsResult.rows.map(r => r.meter_number));

    const grouped = {
      residential: [],
      commercial: [],
      government: []
    };

    customers.forEach(c => {
      const type = c.customer_type?.toLowerCase();
      const status = doneMeterNumbers.has(c.meter_number) ? 'Done' : 'Pending';
      const customerWithStatus = { ...c, status };
      if (type === 'residential') grouped.residential.push(customerWithStatus);
      else if (type === 'commercial') grouped.commercial.push(customerWithStatus);
      else if (type === 'government') grouped.government.push(customerWithStatus);
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Temporary test endpoint - REMOVE IN PRODUCTION
app.get('/test-user/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, password FROM staff_tb WHERE username = $1',
      [req.params.username]
    );
    
    if (result.rows.length === 0) {
      return res.json({ exists: false });
    }

    const user = result.rows[0];
    res.json({
      exists: true,
      id: user.id,
      username: user.username,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      passwordPrefix: user.password?.substring(0, 10) + '...'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to save meter reading
app.post('/readings', async (req, res) => {
  console.log('Received body:', req.body);
  const { meter_number, reading_value, remarks, staff_id } = req.body;
  if (reading_value === undefined || reading_value === null || isNaN(Number(reading_value))) {
    return res.status(400).json({ error: 'Invalid reading value' });
  }
  try {
    // First, get the customer type for this meter number
    const customerResult = await pool.query(
      'SELECT customer_type FROM customers_tb WHERE meter_number = $1',
      [meter_number]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meter number not found' });
    }

    const customerType = customerResult.rows[0].customer_type;

    // Get the applicable rate for this customer type
    const rateResult = await pool.query(
      'SELECT rate_per_cu_m, minimum_charge FROM rates_tb WHERE customer_type = $1 AND status = $2 ORDER BY effective_datec DESC LIMIT 1',
      [customerType, 'active']
    );

    if (rateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rate not found for this customer type' });
    }

    const { rate_per_cu_m, minimum_charge } = rateResult.rows[0];
    
    // Calculate the amount
    const amount = Number(minimum_charge) + (Number(reading_value) * Number(rate_per_cu_m));

    // Save the reading with calculated amount
    const result = await pool.query(
      'INSERT INTO meter_readings (meter_number, reading_value, remarks, staff_id, reading_date, amount) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) RETURNING *',
      [meter_number, reading_value, remarks, staff_id, amount]
    );

    res.json({ 
      success: true, 
      reading_value: {
        ...result.rows[0],
        customer_type: customerType,
        rate_per_cu_m,
        minimum_charge
      }
    });
  } catch (err) {
    console.error('Error saving reading:', err);
    res.status(500).json({ error: 'Failed to save meter reading' });
  }
});

// Endpoint to get staff profile
app.get('/profile/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, username, email, address, contact_number, role, profile_image FROM staff_tb WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = result.rows[0];
    if (profile.profile_image) {
      profile.profile_image_url = `http://192.168.254.184:3000/uploads/${profile.profile_image}`;
    }

    res.json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Endpoint to update staff profile
app.put('/profile/:id', (req, res) => {
  console.log('Received profile update request:', req.body);
  
  upload.single('profile_image')(req, res, async function(err) {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    const { name, email, contact_number, address } = req.body;
    console.log('File uploaded:', req.file);
    console.log('Form data:', { name, email, contact_number, address });

    try {
      let query = 'UPDATE staff_tb SET name = $1, email = $2, contact_number = $3, address = $4';
      let values = [name, email, contact_number, address];
      
      if (req.file) {
        query += ', profile_image = $' + (values.length + 1);
        values.push(req.file.filename);
      }
      
      query += ' WHERE id = $' + (values.length + 1) + ' RETURNING id, name, username, email, address, contact_number, role, profile_image';
      values.push(req.params.id);

      console.log('Executing query:', query);
      console.log('With values:', values);

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const profile = result.rows[0];
      if (profile.profile_image) {
        profile.profile_image_url = `http://192.168.254.184:3000/uploads/${profile.profile_image}`;
      }

      console.log('Updated profile:', profile);
      res.json(profile);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to update profile: ' + err.message });
    }
  });
});

app.get('/readings/:meter_number', async (req, res) => {
  console.log('GET /readings/:meter_number called with', req.params.meter_number);
  try {
    const result = await pool.query(
      'SELECT * FROM meter_readings WHERE meter_number = $1 ORDER BY reading_date DESC',
      [req.params.meter_number]
    );
    // Always return an array, even if empty
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

app.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000')); 