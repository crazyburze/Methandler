-- Create meter_readings table
CREATE TABLE IF NOT EXISTS meter_readings (
    id SERIAL PRIMARY KEY,
    meter_number VARCHAR(255) NOT NULL,
    reading_value DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    staff_id INTEGER REFERENCES staff_tb(id),
    reading_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 