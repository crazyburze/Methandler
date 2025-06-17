const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'password123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Your hashed password is:', hash);
    console.log('\nUse this complete SQL query:');
    console.log(`
INSERT INTO staff_tb (id, name, username, password, role, address, contact_number, email) 
VALUES (
    DEFAULT,
    'John Doe',
    'meterhandler1',
    '${hash}',
    'meter handler',
    '123 Main Street',
    '09123456789',
    'john.doe@email.com'
);`);
}

generateHash(); 