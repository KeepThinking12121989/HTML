const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const PayPal = require('paypal-rest-sdk');
const User = require('./models/User'); // Define User model in models/User.js

const app = express();

mongoose.connect('mongodb://localhost:27017/marketplace', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(require('express-session')({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

PayPal.configure({
    'mode': 'sandbox', // or 'live'
    'client_id': 'YOUR_PAYPAL_CLIENT_ID',
    'client_secret': 'YOUR_PAYPAL_CLIENT_SECRET'
});

// User registration route
app.post('/register', (req, res) => {
    User.register(new User({ username: req.body.username }), req.body.password, (err, user) => {
        if (err) {
            return res.send(err);
        }
        passport.authenticate('local')(req, res, () => {
            res.redirect('/');
        });
    });
});

// User login route
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Route to handle item price estimation
app.post('/estimate', isLoggedIn, (req, res) => {
    const { itemType, item } = req.body;

    User.findById(req.user._id, (err, user) => {
        if (err) {
            return res.send(err);
        }

        if (user.queryCount < 5) {
            user.queryCount++;
            user.save();
            // Simulate fetching price estimates
            if (itemType === 'website') {
                // Simulate different logic for website/domain estimation
                res.json({
                    low: 1000,
                    average: 5000,
                    high: 10000
                });
            } else {
                res.json({
                    low: 10,
                    average: 20,
                    high: 30
                });
            }
        } else {
            res.status(402).json({
                message: 'Please make a payment to continue using the service.'
            });
        }
    });
});

// PayPal payment route
app.post('/