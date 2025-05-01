const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../databases/db');
require('dotenv').config();

const registerUser = async (req, res) => {
    try {
        const { username, password, role, associated_id, email } = req.body;

        // Check if user exists
        const [existingUser] = await pool.query(
            'SELECT * FROM Users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        const [result] = await pool.query(
            'INSERT INTO Users (username, password_hash, role, associated_id, email) VALUES (?, ?, ?, ?, ?)',
            [username, passwordHash, role, associated_id, email]
        );

        const newUser = {
            user_id: result.insertId,
            username,
            role,
            associated_id,
            email
        };

        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const [users] = await pool.query(
            'SELECT * FROM Users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(400).json({ message: 'Account is disabled' });
        }

        // Update last login
        await pool.query(
            'UPDATE Users SET last_login = NOW() WHERE user_id = ?',
            [user.user_id]
        );

        // Create JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
                associated_id: user.associated_id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT user_id, username, role, associated_id, email, last_login FROM Users WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getCurrentUser
};