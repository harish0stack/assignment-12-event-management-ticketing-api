const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebaseConfig');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_event_management_2026_harish_malviya';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user as Attendee or Organizer
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, role'
      });
    }

    // Normalize and validate role
    const normalizedRole =
      role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (!['Organizer', 'Attendee'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles are: Organizer, Attendee'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingSnapshot = await usersRef
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userDocRef = usersRef.doc();
    const newUser = {
      id: userDocRef.id,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      createdAt: new Date().toISOString()
    };

    await userDocRef.set(newUser);

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: `${normalizedRole} registered successfully`,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user: ' + error.message
    });
  }
};

/**
 * Authenticate user and issue JWT token
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: userData.id || userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: userData.id || userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login: ' + error.message
    });
  }
};

/**
 * Retrieve authenticated user profile & role
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();
    delete userData.password; // Do not return password hash

    res.status(200).json({
      success: true,
      data: {
        id: userData.id || userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile: ' + error.message
    });
  }
};
